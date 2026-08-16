import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

type Body = { subscriptionId?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mollieHeaders = () => ({ Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`, "Content-Type": "application/json" });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "Authentication required" }, 401);
    const body = await request.json() as Body;
    if (!body.subscriptionId || !uuid.test(body.subscriptionId)) return json({ error: "Invalid subscription" }, 400);

    const supabase = adminClient();
    const { data: auth } = await supabase.auth.getUser(accessToken);
    const user = auth.user;
    if (!user) return json({ error: "Authentication required" }, 401);

    const { data: subscription, error } = await supabase.from("customer_subscriptions")
      .select("id,organization_id,customer_user_id,status,provider,provider_customer_id,provider_first_payment_id,customer_subscription_plans(id,name,price,currency,billing_interval)")
      .eq("id", body.subscriptionId).single();
    if (error || !subscription) return json({ error: "Subscription not found" }, 404);
    if (subscription.customer_user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!["pending","past_due"].includes(subscription.status)) return json({ error: "Subscription cannot start payment" }, 409);
    const plan: any = subscription.customer_subscription_plans;
    if (!plan || Number(plan.price) < 0.01) return json({ error: "Subscription plan is not payable" }, 409);

    let customerId = subscription.provider_customer_id;
    if (!customerId) {
      const customerResponse = await fetch("https://api.mollie.com/v2/customers", { method: "POST", headers: mollieHeaders(), body: JSON.stringify({ name: user.user_metadata?.full_name || user.email || "FitConnect klant", email: user.email, metadata: { organization_id: subscription.organization_id, customer_user_id: user.id } }) });
      if (!customerResponse.ok) throw new Error(`Mollie customer creation failed: ${customerResponse.status}`);
      const customer = await customerResponse.json(); customerId = customer.id;
      const { error: updateError } = await supabase.from("customer_subscriptions").update({ provider: "mollie", provider_customer_id: customerId, updated_at: new Date().toISOString() }).eq("id", subscription.id).eq("customer_user_id", user.id);
      if (updateError) throw updateError;
    }

    if (subscription.provider_first_payment_id) {
      const previous = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(subscription.provider_first_payment_id)}`, { headers: mollieHeaders() });
      if (previous.ok) { const payment = await previous.json(); const url = payment?._links?.checkout?.href; if (url && ["open","pending"].includes(payment.status)) return json({ checkoutUrl: url, paymentId: payment.id, reused: true }); }
    }

    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/subscription-mollie-webhook`;
    const redirectBase = (Deno.env.get("SUBSCRIPTION_RETURN_URL") || requiredEnv("CHECKOUT_RETURN_URL")).replace(/\/$/, "");
    const paymentResponse = await fetch("https://api.mollie.com/v2/payments", { method: "POST", headers: mollieHeaders(), body: JSON.stringify({ amount: { currency: String(plan.currency || "EUR").toUpperCase(), value: Number(plan.price).toFixed(2) }, customerId, sequenceType: "first", description: `FitConnect ${plan.name}`, redirectUrl: `${redirectBase}/?subscription=${encodeURIComponent(subscription.id)}`, webhookUrl, metadata: { purpose: "subscription_first", organization_id: subscription.organization_id, customer_user_id: user.id, subscription_id: subscription.id, plan_id: plan.id } }) });
    if (!paymentResponse.ok) throw new Error(`Mollie first payment failed: ${paymentResponse.status}`);
    const payment = await paymentResponse.json();
    const { error: saveError } = await supabase.from("customer_subscriptions").update({ provider: "mollie", provider_customer_id: customerId, provider_first_payment_id: payment.id, provider_last_payment_id: payment.id, provider_last_event_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", subscription.id).eq("customer_user_id", user.id);
    if (saveError) throw saveError;
    return json({ checkoutUrl: payment?._links?.checkout?.href, paymentId: payment.id });
  } catch (error) {
    console.error("subscription-mollie-start", error instanceof Error ? error.message : "unknown");
    return json({ error: "Subscription payment could not be started" }, 500);
  }
});