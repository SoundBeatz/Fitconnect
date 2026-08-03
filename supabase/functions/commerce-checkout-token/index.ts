import { corsHeaders, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { cleanText, normalizeEmail, validEmail } from "../_shared/validation.ts";
import { clientIp, consumeRateLimit, sha256, signPaymentToken } from "../_shared/payment-security.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json() as { email?: string };
    const email = normalizeEmail(body.email);
    if (!validEmail(email)) return json({ error: "Vul een geldig e-mailadres in." }, 400);

    const supabase = adminClient();
    const ip = clientIp(request);
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit(supabase, "checkout_nonce_ip", ip, 30, 600),
      consumeRateLimit(supabase, "checkout_nonce_email", email, 10, 600),
    ]);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds, 1);
      return new Response(JSON.stringify({ error: "Te veel betaalpogingen. Probeer het later opnieuw." }), {
        status: 429,
        headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8", "retry-after": String(retry), "cache-control": "no-store" },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();
    const emailHash = await sha256(email);
    const ipHash = await sha256(ip);
    const expiresAt = new Date((now + 300) * 1000).toISOString();

    const { error } = await supabase.from("commerce_checkout_security_nonces").insert({
      jti,
      email_hash: emailHash,
      ip_hash: ipHash,
      expires_at: expiresAt,
    });
    if (error) throw error;

    const checkoutNonce = await signPaymentToken({ purpose: "checkout:create", jti, iat: now, exp: now + 300, emailHash });
    return json({ checkoutNonce, expiresIn: 300 });
  } catch (error) {
    console.error("commerce-checkout-token", error instanceof Error ? error.message : "unknown");
    return json({ error: "De beveiligde checkout kon niet worden voorbereid." }, 500);
  }
});
