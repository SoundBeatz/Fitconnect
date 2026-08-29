import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/edits";
const OPENAI_IMAGE_MODEL = "gpt-image-2";
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 120_000;

function env(name: string): string {
  return Deno.env.get(name)?.trim() || "";
}

function requiredEnv(name: string): string {
  const value = env(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization") || "";
  const suppliedToken = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!suppliedToken || !timingSafeEqual(suppliedToken, serviceRoleKey)) {
    return json({ error: "Internal renderer authentication required" }, 401);
  }

  const openAiKey = env("OPENAI_API_KEY");
  if (!openAiKey) {
    return json({ error: "Renderer not configured", code: "OPENAI_API_KEY_MISSING" }, 503);
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return json({ error: "Invalid renderer request" }, 400);
  }

  const image = incoming.get("image");
  const prompt = String(incoming.get("prompt") || "").trim();
  const jobId = String(incoming.get("job_id") || "").trim();
  const promptRevision = String(incoming.get("prompt_revision") || "").trim();

  if (!(image instanceof File)) return json({ error: "Identity reference missing" }, 400);
  if (!prompt || prompt.length > 8000) return json({ error: "Canonical prompt invalid" }, 400);
  if (image.size <= 0 || image.size > MAX_SOURCE_BYTES) return json({ error: "Identity reference exceeds renderer limit" }, 413);
  if (image.type !== "image/jpeg") return json({ error: "Identity reference must be JPEG" }, 415);

  const sourceBytes = new Uint8Array(await image.arrayBuffer());
  if (!isJpeg(sourceBytes)) return json({ error: "Identity reference failed JPEG validation" }, 415);

  const requestBody = new FormData();
  requestBody.append("model", OPENAI_IMAGE_MODEL);
  requestBody.append("image", new File([sourceBytes], "identity-reference.jpg", { type: "image/jpeg" }));
  requestBody.append("prompt", prompt);
  requestBody.append("size", "1024x1536");
  requestBody.append("quality", "medium");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(OPENAI_IMAGE_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    const code = error instanceof DOMException && error.name === "AbortError" ? "OPENAI_TIMEOUT" : "OPENAI_NETWORK";
    return json({ error: "Image renderer unavailable", code }, 502);
  } finally {
    clearTimeout(timeout);
  }

  const requestId = response.headers.get("x-request-id") || null;
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    return json({ error: "Invalid renderer response", code: "OPENAI_INVALID_JSON", requestId }, 502);
  }

  if (!response.ok) {
    const providerCode = String(payload?.error?.code || payload?.error?.type || `HTTP_${response.status}`).slice(0, 120);
    return json({ error: "Image renderer rejected the request", code: providerCode, requestId }, response.status >= 500 ? 502 : 422);
  }

  const encoded = payload?.data?.[0]?.b64_json;
  if (typeof encoded !== "string" || !encoded) {
    return json({ error: "Renderer returned no image", code: "OPENAI_NO_IMAGE", requestId }, 502);
  }

  let output: Uint8Array;
  try {
    output = decodeBase64(encoded);
  } catch {
    return json({ error: "Renderer image could not be decoded", code: "OPENAI_BAD_BASE64", requestId }, 502);
  }

  if (!output.length || output.length > MAX_OUTPUT_BYTES) {
    return json({ error: "Renderer output exceeds safe limit", code: "OPENAI_OUTPUT_SIZE", requestId }, 502);
  }

  let contentType = "";
  if (isJpeg(output)) contentType = "image/jpeg";
  else if (isPng(output)) contentType = "image/png";
  else return json({ error: "Renderer output failed image validation", code: "OPENAI_OUTPUT_MAGIC", requestId }, 502);

  return new Response(output, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "x-fitconnect-renderer": "openai-gpt-image-2",
      "x-fitconnect-prompt-revision": promptRevision || "unknown",
      "x-fitconnect-job-id": jobId || "unknown",
      ...(requestId ? { "x-openai-request-id": requestId } : {}),
    },
  });
});
