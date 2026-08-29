import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 2048;
const MAX_PIXELS = MAX_DIMENSION * MAX_DIMENSION;
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_ATTEMPTS = 5;

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
  const allowed = allowedOrigins();
  const selected = origin && allowed.has(origin) ? origin : "https://fitconnect.nl";
  const fallback = "authorization, x-client-info, x-application-name, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
  return {
    "access-control-allow-origin": selected,
    "access-control-allow-headers": requestedHeaders?.trim() || fallback,
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
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (!isJpeg(bytes)) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > bytes.length) return null;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    const isSof = [0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker);
    if (isSof && length >= 7) {
      return {
        height: (bytes[offset + 3] << 8) | bytes[offset + 4],
        width: (bytes[offset + 5] << 8) | bytes[offset + 6],
      };
    }
    offset += length;
  }
  return null;
}

function stripJpegMetadata(bytes: Uint8Array): Uint8Array {
  if (!isJpeg(bytes)) throw new Error("not jpeg");
  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let offset = 2;
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("invalid jpeg structure");
    const markerStart = offset;
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) break;
    const marker = bytes[offset++];
    if (marker === 0xda) {
      if (offset + 2 > bytes.length) throw new Error("invalid sos");
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) throw new Error("invalid sos length");
      chunks.push(bytes.slice(markerStart));
      break;
    }
    if (marker === 0xd9) { chunks.push(bytes.slice(markerStart, offset)); break; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { chunks.push(bytes.slice(markerStart, offset)); continue; }
    if (offset + 2 > bytes.length) throw new Error("invalid segment");
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) throw new Error("invalid segment length");
    const end = offset + length;
    const isMetadata = (marker >= 0xe1 && marker <= 0xed) || marker === 0xef || marker === 0xfe;
    if (!isMetadata) chunks.push(bytes.slice(markerStart, end));
    offset = end;
  }
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { output.set(chunk, pos); pos += chunk.length; }
  return output;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
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

  const authorization = req.headers.get("authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return json(origin, { error: "Authentication required" }, 401);

  const accessToken = authorization.slice(7).trim();
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const anonKey = requiredEnv("SUPABASE_ANON_KEY");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${accessToken}` } } });
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json(origin, { error: "Invalid session" }, 401);
  const userId = userData.user.id;

  const cutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error: countError } = await admin.from("avatar_ingest_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("attempted_at", cutoff);
  if (countError) return json(origin, { error: "Image security service unavailable" }, 503);
  if ((count ?? 0) >= RATE_LIMIT_ATTEMPTS) return json(origin, { error: "Te veel uploadpogingen. Probeer het over enkele minuten opnieuw." }, 429);
  const { error: attemptError } = await admin.from("avatar_ingest_attempts").insert({ user_id: userId });
  if (attemptError) return json(origin, { error: "Image security service unavailable" }, 503);

  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_REQUEST_BYTES + 512 * 1024) return json(origin, { error: "Verwerkte afbeelding is te groot." }, 413);

  let formData: FormData;
  try { formData = await req.formData(); } catch { return json(origin, { error: "Ongeldige upload." }, 400); }
  const file = formData.get("file");
  const consent = formData.get("consent");
  if (consent !== "true") return json(origin, { error: "Expliciete toestemming is vereist." }, 400);
  if (!(file instanceof File)) return json(origin, { error: "Afbeelding ontbreekt." }, 400);
  if (file.size <= 0 || file.size > MAX_REQUEST_BYTES) return json(origin, { error: "Verwerkte afbeelding moet kleiner zijn dan 4 MB." }, 413);
  if (file.type !== "image/jpeg") return json(origin, { error: "De beveiligde tussenversie moet JPEG zijn." }, 415);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isJpeg(bytes)) return json(origin, { error: "Bestandsinhoud komt niet overeen met JPEG." }, 415);
  const dimensions = jpegDimensions(bytes);
  if (!dimensions || dimensions.width < 256 || dimensions.height < 256) return json(origin, { error: "Afbeelding is ongeldig of heeft onvoldoende resolutie." }, 400);
  if (dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION || dimensions.width * dimensions.height > MAX_PIXELS) return json(origin, { error: "Afbeeldingsresolutie overschrijdt de veilige limiet." }, 413);

  let processed: Uint8Array;
  try { processed = stripJpegMetadata(bytes); } catch { return json(origin, { error: "Afbeelding kon niet veilig worden opgeschoond." }, 422); }
  if (!processed.length || processed.length > MAX_REQUEST_BYTES) return json(origin, { error: "Geoptimaliseerde afbeelding voldoet niet aan de opslaglimiet." }, 422);
  const digest = await sha256Hex(bytes);

  const { data: existingAvatar, error: avatarReadError } = await admin.from("user_avatars").select("id,active_version").eq("user_id", userId).maybeSingle();
  if (avatarReadError) return json(origin, { error: "Avatarprofiel kon niet worden gelezen." }, 500);

  let avatarId = existingAvatar?.id as string | undefined;
  if (!avatarId) {
    const { data: createdAvatar, error: avatarCreateError } = await admin.from("user_avatars").insert({ user_id: userId, avatar_type: "ai", gender: null, suit: "performance", status: "draft", active_version: 1 }).select("id").single();
    if (avatarCreateError || !createdAvatar?.id) return json(origin, { error: "Avatarprofiel kon niet veilig worden voorbereid." }, 500);
    avatarId = createdAvatar.id;
  }

  const { data: latestVersion, error: versionReadError } = await admin.from("avatar_versions").select("version").eq("avatar_id", avatarId).order("version", { ascending: false }).limit(1);
  if (versionReadError) return json(origin, { error: "Avatarversie kon niet worden bepaald." }, 500);
  const version = (latestVersion?.[0]?.version ?? 0) + 1;
  const path = `${userId}/processed/v${version}-${Date.now()}.jpg`;

  const { error: uploadError } = await admin.storage.from("avatars").upload(path, processed, { contentType: "image/jpeg", cacheControl: "3600", upsert: false });
  if (uploadError) return json(origin, { error: "Veilige opslag is mislukt." }, 500);

  const versionPayload = {
    avatar_id: avatarId,
    version,
    avatar_image: path,
    source_sha256: digest,
    source_bytes: file.size,
    processed_bytes: processed.length,
    processed_width: dimensions.width,
    processed_height: dimensions.height,
    notes: "Bron lokaal genormaliseerd; server-side gevalideerd en JPEG metadata gestript",
  };
  const { data: insertedVersion, error: versionInsertError } = await admin.from("avatar_versions").insert(versionPayload).select("id").single();
  if (versionInsertError || !insertedVersion?.id) {
    await admin.storage.from("avatars").remove([path]);
    return json(origin, { error: versionInsertError?.code === "23505" ? "Gelijktijdige upload gedetecteerd. Probeer opnieuw." : "Avatarversie kon niet worden opgeslagen." }, versionInsertError?.code === "23505" ? 409 : 500);
  }

  const { error: avatarUpdateError } = await admin.from("user_avatars").update({
    avatar_type: "ai",
    gender: null,
    suit: "performance",
    status: "uploaded",
    source_photo: path,
    active_version: version,
    source_sha256: digest,
    source_bytes: file.size,
    processed_bytes: processed.length,
    processed_width: dimensions.width,
    processed_height: dimensions.height,
    updated_at: new Date().toISOString(),
  }).eq("id", avatarId).eq("user_id", userId);

  if (avatarUpdateError) {
    await admin.from("avatar_versions").delete().eq("id", insertedVersion.id);
    await admin.storage.from("avatars").remove([path]);
    return json(origin, { error: "Avatarstatus kon niet veilig worden bijgewerkt." }, 500);
  }

  return json(origin, { ok: true, status: "uploaded", version, path, processedBytes: processed.length, width: dimensions.width, height: dimensions.height });
});
