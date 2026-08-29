import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const PROMPT_REVISION = "canonical-v1";
const RENDER_TIMEOUT_MS = 90_000;
const MAX_RENDER_BYTES = 5 * 1024 * 1024;

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("MY_TWIN_ALLOWED_ORIGINS")?.trim();
  const values = configured
    ? configured.split(",").map((value) => value.trim()).filter(Boolean)
    : ["https://fitconnect.nl", "https://www.fitconnect.nl"];
  return new Set(values);
}

function corsHeaders(origin: string | null, requestedHeaders?: string | null): Record<string, string> {
  const selected = origin && allowedOrigins().has(origin) ? origin : "https://fitconnect.nl";
  return {
    "access-control-allow-origin": selected,
    "access-control-allow-headers": requestedHeaders?.trim() || "authorization, apikey, content-type, x-client-info",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-max-age": "86400",
    "vary": "Origin, Access-Control-Request-Headers",
  };
}

function json(origin: string | null, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

function canonicalPrompt(): string {
  return [
    "Create one photorealistic full-body FitConnect canonical digital twin from the supplied identity reference.",
    "Preserve the same person's facial identity, apparent age, skin tone, hair, proportions and distinguishing facial features with maximum consistency.",
    "Do not beautify, de-age, exaggerate musculature or change ethnicity or sex characteristics.",
    "Neutral front-facing standing pose, arms relaxed naturally, feet visible, eye-level full-body camera, centered symmetrical composition.",
    "Black premium FitConnect Performance Suit without third-party branding, neutral dark studio background, premium softbox lighting.",
    "No text, no watermark, no props, no dramatic action pose. The result is the canonical identity baseline for longitudinal body-state versions."
  ].join(" ");
}

async function readAuthenticatedUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();

  if (req.method === "OPTIONS") {
    if (origin && !allowed.has(origin)) return json(origin, { error: "Origin not allowed" }, 403);
    return new Response(null, { status: 204, headers: corsHeaders(origin, req.headers.get("access-control-request-headers")) });
  }
  if (req.method !== "POST") return json(origin, { error: "Method not allowed" }, 405);
  if (origin && !allowed.has(origin)) return json(origin, { error: "Origin not allowed" }, 403);

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const user = await readAuthenticatedUser(req, supabaseUrl, anonKey);
  if (!user) return json(origin, { error: "Authentication required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: avatar, error: avatarError } = await admin
    .from("user_avatars")
    .select("id,user_id,avatar_type,status,source_photo,source_sha256,active_version,suit")
    .eq("user_id", user.id)
    .maybeSingle();

  if (avatarError) return json(origin, { error: "My Twin profiel kon niet worden geladen." }, 500);
  if (!avatar || avatar.avatar_type !== "ai" || !avatar.source_photo || !avatar.source_sha256 || !avatar.active_version) {
    return json(origin, { error: "Sla eerst een geldige eigen foto op voordat u My Twin genereert." }, 409);
  }
  if (!["uploaded", "failed", "ready", "processing"].includes(avatar.status)) {
    return json(origin, { error: "My Twin bevindt zich niet in een genereerbare status." }, 409);
  }

  const { data: sourceVersion, error: sourceVersionError } = await admin
    .from("avatar_versions")
    .select("id,version,avatar_image,source_sha256,processed_width,processed_height")
    .eq("avatar_id", avatar.id)
    .eq("version", avatar.active_version)
    .maybeSingle();
  if (sourceVersionError || !sourceVersion) return json(origin, { error: "De bronversie van My Twin ontbreekt." }, 409);

  const renderContract = {
    pose: "neutral_front",
    camera: "full_body_eye_level",
    background: "studio_neutral_dark",
    suit: "fitconnect_performance_black",
    lighting: "premium_softbox",
    identity_priority: "maximum",
    body_state: "source",
  };

  const { data: identity, error: identityError } = await admin
    .from("my_twin_identity_profiles")
    .upsert({
      user_id: user.id,
      avatar_id: avatar.id,
      source_sha256: avatar.source_sha256,
      prompt_revision: PROMPT_REVISION,
      render_contract: renderContract,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (identityError || !identity) return json(origin, { error: "Canonical identity-profiel kon niet worden vastgelegd." }, 500);

  const { data: existingActive, error: existingError } = await admin
    .from("my_twin_generation_jobs")
    .select("*")
    .eq("avatar_id", avatar.id)
    .in("status", ["queued", "awaiting_renderer", "rendering"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return json(origin, { error: "Generatiestatus kon niet worden gecontroleerd." }, 500);

  const rendererUrl = Deno.env.get("MY_TWIN_RENDERER_URL")?.trim() || "";
  const rendererKey = Deno.env.get("MY_TWIN_RENDERER_API_KEY")?.trim() || "";

  let job = existingActive;
  if (!job) {
    const { data: inserted, error: insertError } = await admin
      .from("my_twin_generation_jobs")
      .insert({
        user_id: user.id,
        avatar_id: avatar.id,
        identity_profile_id: identity.id,
        source_avatar_version: avatar.active_version,
        status: rendererUrl ? "queued" : "awaiting_renderer",
        renderer: rendererUrl ? "fitconnect-render-adapter-v1" : null,
        prompt_revision: PROMPT_REVISION,
        parameters: { render_contract: renderContract, consistency_seed: identity.consistency_seed },
      })
      .select("*")
      .single();
    if (insertError || !inserted) return json(origin, { error: "Generatieopdracht kon niet worden aangemaakt." }, 500);
    job = inserted;
  }

  if (!rendererUrl) {
    if (job.status !== "awaiting_renderer") {
      await admin.from("my_twin_generation_jobs").update({ status: "awaiting_renderer", updated_at: new Date().toISOString() }).eq("id", job.id);
    }
    return json(origin, {
      ok: true,
      jobId: job.id,
      status: "awaiting_renderer",
      identityRevision: identity.identity_revision,
      message: "Canonical Identity Engine is gereed; de beeldrenderer moet nog server-side worden geactiveerd."
    }, 202);
  }

  if (job.status === "rendering") {
    return json(origin, { ok: true, jobId: job.id, status: "rendering", message: "My Twin wordt al gegenereerd." }, 202);
  }

  const now = new Date().toISOString();
  await admin.from("my_twin_generation_jobs").update({ status: "rendering", renderer: "fitconnect-render-adapter-v1", started_at: job.started_at || now, updated_at: now, error_code: null, error_message: null }).eq("id", job.id);
  await admin.from("user_avatars").update({ status: "processing", updated_at: now }).eq("id", avatar.id);

  try {
    const { data: sourceBlob, error: downloadError } = await admin.storage.from("avatars").download(avatar.source_photo);
    if (downloadError || !sourceBlob) throw new Error("SOURCE_DOWNLOAD_FAILED");

    const form = new FormData();
    form.append("image", new File([sourceBlob], "identity-reference.jpg", { type: sourceBlob.type || "image/jpeg" }));
    form.append("prompt", canonicalPrompt());
    form.append("prompt_revision", PROMPT_REVISION);
    form.append("consistency_seed", String(identity.consistency_seed));
    form.append("render_contract", JSON.stringify(renderContract));
    form.append("job_id", job.id);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);
    let renderResponse: Response;
    try {
      const headers: HeadersInit = rendererKey ? { Authorization: `Bearer ${rendererKey}` } : {};
      renderResponse = await fetch(rendererUrl, { method: "POST", headers, body: form, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (!renderResponse.ok) throw new Error(`RENDERER_HTTP_${renderResponse.status}`);
    const contentType = (renderResponse.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!["image/jpeg", "image/png"].includes(contentType)) throw new Error("RENDERER_CONTENT_TYPE");
    const output = new Uint8Array(await renderResponse.arrayBuffer());
    if (!output.length || output.length > MAX_RENDER_BYTES) throw new Error("RENDERER_OUTPUT_SIZE");
    if (contentType === "image/jpeg" && !isJpeg(output)) throw new Error("RENDERER_MAGIC_BYTES");
    if (contentType === "image/png" && !isPng(output)) throw new Error("RENDERER_MAGIC_BYTES");

    const { data: latestVersions, error: latestError } = await admin
      .from("avatar_versions")
      .select("version")
      .eq("avatar_id", avatar.id)
      .order("version", { ascending: false })
      .limit(1);
    if (latestError) throw new Error("VERSION_READ_FAILED");
    const targetVersion = (latestVersions?.[0]?.version ?? 0) + 1;
    const ext = contentType === "image/png" ? "png" : "jpg";
    const outputPath = `${user.id}/generated/v${targetVersion}-${Date.now()}.${ext}`;

    const { error: storageError } = await admin.storage.from("avatars").upload(outputPath, output, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });
    if (storageError) throw new Error("OUTPUT_STORAGE_FAILED");

    const { error: versionError } = await admin.from("avatar_versions").insert({
      avatar_id: avatar.id,
      version: targetVersion,
      avatar_image: outputPath,
      source_sha256: avatar.source_sha256,
      processed_bytes: output.length,
      notes: `Canonical My Twin render ${PROMPT_REVISION}; source version ${avatar.active_version}`,
    });
    if (versionError) {
      await admin.storage.from("avatars").remove([outputPath]);
      throw new Error("VERSION_WRITE_FAILED");
    }

    const completedAt = new Date().toISOString();
    await admin.from("user_avatars").update({
      avatar_image: outputPath,
      status: "ready",
      active_version: targetVersion,
      updated_at: completedAt,
    }).eq("id", avatar.id);
    await admin.from("my_twin_generation_jobs").update({
      status: "ready",
      target_avatar_version: targetVersion,
      output_path: outputPath,
      completed_at: completedAt,
      updated_at: completedAt,
    }).eq("id", job.id);

    return json(origin, { ok: true, jobId: job.id, status: "ready", version: targetVersion, outputPath, identityRevision: identity.identity_revision });
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 120) : "GENERATION_FAILED";
    const failedAt = new Date().toISOString();
    await admin.from("my_twin_generation_jobs").update({ status: "failed", error_code: code, error_message: "Canonical render failed", completed_at: failedAt, updated_at: failedAt }).eq("id", job.id);
    await admin.from("user_avatars").update({ status: "failed", updated_at: failedAt }).eq("id", avatar.id);
    return json(origin, { error: "My Twin kon nog niet worden gegenereerd.", code }, 502);
  }
});