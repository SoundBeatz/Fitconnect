import { requiredEnv } from "./http.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmacKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(requiredEnv("PAYMENT_TOKEN_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export type PaymentTokenPayload = {
  purpose: "checkout:create" | "checkout:status";
  jti: string;
  iat: number;
  exp: number;
  emailHash?: string;
  checkoutSessionId?: string;
};

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return base64UrlEncode(new Uint8Array(digest));
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function signPaymentToken(payload: PaymentTokenPayload): Promise<string> {
  const encoded = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(encoded));
  return `${encoded}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyPaymentToken(token: string, expectedPurpose: PaymentTokenPayload["purpose"]): Promise<PaymentTokenPayload> {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) throw new Error("Invalid security token");
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(), base64UrlDecode(signature), encoder.encode(encoded));
  if (!valid) throw new Error("Invalid security token");
  const payload = JSON.parse(decoder.decode(base64UrlDecode(encoded))) as PaymentTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.purpose !== expectedPurpose || !payload.jti || !payload.iat || !payload.exp || payload.exp <= now || payload.iat > now + 30) {
    throw new Error("Expired or invalid security token");
  }
  return payload;
}

export async function consumeRateLimit(supabase: any, scope: string, key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const keyHash = await sha256(key);
  const { data, error } = await supabase.rpc("commerce_consume_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    remaining: Number(row?.remaining ?? 0),
    retryAfterSeconds: Number(row?.retry_after_seconds ?? 0),
  };
}
