export const corsHeaders = {
  "access-control-allow-origin": Deno.env.get("CHECKOUT_ALLOWED_ORIGIN") ?? "https://fitconnect.nl",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, idempotency-key",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-max-age": "86400",
  "vary": "Origin",
};

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "pragma": "no-cache",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}
