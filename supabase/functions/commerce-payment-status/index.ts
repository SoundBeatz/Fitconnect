import { corsHeaders, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { checkoutSessionId, idempotencyKey } = await request.json();
    if (!uuidPattern.test(checkoutSessionId ?? "") || !uuidPattern.test(idempotencyKey ?? "")) return json({ error: "Invalid checkout reference" }, 400);
    const { data, error } = await adminClient().from("commerce_checkout_sessions").select("id,status,first_name,email,created_at,sales_order_id,commerce_payments(status)").eq("id", checkoutSessionId).eq("idempotency_key", idempotencyKey).single();
    if (error || !data) return json({ error: "Checkout not found" }, 404);
    const payment = Array.isArray(data.commerce_payments) ? data.commerce_payments[0] : data.commerce_payments;
    return json({
      checkoutStatus: data.status,
      paymentStatus: payment?.status ?? "pending",
      customer: { firstName: data.first_name, email: data.email },
      order: {
        reference: (data.sales_order_id ?? data.id).slice(0, 8).toUpperCase(),
        status: data.status,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("commerce-payment-status", error);
    return json({ error: "Status unavailable" }, 500);
  }
});
