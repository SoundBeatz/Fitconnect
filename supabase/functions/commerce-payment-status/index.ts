import { corsHeaders, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { clientIp, consumeRateLimit, verifyPaymentToken } from "../_shared/payment-security.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { checkoutSessionId, statusToken } = await request.json() as { checkoutSessionId?: string; statusToken?: string };
    if (!uuidPattern.test(checkoutSessionId ?? "")) return json({ error: "Invalid checkout reference" }, 400);

    const token = await verifyPaymentToken(statusToken ?? "", "checkout:status");
    if (token.checkoutSessionId !== checkoutSessionId) return json({ error: "Invalid status token" }, 403);

    const supabase = adminClient();
    const rate = await consumeRateLimit(supabase, "payment_status_ip", clientIp(request), 60, 600);
    if (!rate.allowed) return json({ error: "Te veel statusverzoeken. Probeer het later opnieuw." }, 429, { "retry-after": String(rate.retryAfterSeconds) });

    const { data, error } = await supabase
      .from("commerce_checkout_sessions")
      .select("id,status,first_name,created_at,sales_order_id,commerce_payments(status)")
      .eq("id", checkoutSessionId)
      .single();
    if (error || !data) return json({ error: "Checkout not found" }, 404);

    const payment = Array.isArray(data.commerce_payments) ? data.commerce_payments[0] : data.commerce_payments;
    return json({
      checkoutStatus: data.status,
      paymentStatus: payment?.status ?? "pending",
      customer: { firstName: data.first_name },
      order: {
        reference: (data.sales_order_id ?? data.id).slice(0, 8).toUpperCase(),
        status: data.status,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status unavailable";
    if (/token/i.test(message)) return json({ error: "Invalid or expired status token" }, 403);
    console.error("commerce-payment-status", message);
    return json({ error: "Status unavailable" }, 500);
  }
});
