export const corsHeaders = {
  "access-control-allow-origin": Deno.env.get("CHECKOUT_ALLOWED_ORIGIN") ?? "https://fitconnect.nl",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "access-control-allow-methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" },
  });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
