import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient, authenticatedClient } from "../_shared/supabase.ts";

type Body = { subscriptionId?: string; planId?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mollieHeaders = () => ({ Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`, "Content-Type": "application/json" });

function periodEnd(interval: string) {
  const date = new Date();
  if (interval === "quarter") date.setMonth(date.getMonth() + 3);
  else if (interval === "year") date.setFullYear(date.getFullYear() + 1);
  else date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "Authentication required" }, 401);

    const body = await request.json() as Body;
    const hasSubscription = Boolean(body.subscriptionId && uuid.test(body.subscriptionId));
    const hasPlan = Boolean(body.planId && uuid.test(body.planId));
    if (!hasSubscription && !hasPlan) return json({ error: "Invalid subscription or plan" }, 400);

    const supabase = adminClient();
    const { data: auth } = await supabase.auth.getUser(accessToken);
    const user = auth.user;
    if (!user) return json({ error: "Authentication required" }, 401);

    let subscriptionId = hasSubscription ? body.subscriptionId! : "";

    if (!subscriptionId && hasPlan) {
      const customerClient = authenticatedClient(accessToken);
      const { data: visiblePlan, error: planError } = await customerClient.from("customer_subscription_plans")
        .select("id,organization_id,name,price,currency,billing_interval,active")
        .eq("id", body.planId!).eq("active", true).single();
      if (planError || !visiblePlan) return json({ error: "Subscription plan not found" }, 404);

      const { data: existing } = await supabase.from("customer_subscriptions")
        .select("id,status")
        .eq("customer_user_id", user.id)
        .eq("organization_id", visiblePlan.organization_id)
        .eq("plan_id", visiblePlan.id)
        .in("status", ["pending", "active", "paused", "past_due"])
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();

      if (existing?.status === "active" || existing?.status === "paused") {
        return json({ error: "Subscription is already active", subscriptionId: existing.id }, 409);
      }

      if (existing?.id) subscriptionId = existing.id;
      else {
        const now = new Date().toISOString();
        const { data: created, error: createError } = await supabase.from("customer_subscriptions").insert({
          organization_id: visiblePlan.organization_id,
          customer_user_id: user.id,
          plan_id: visiblePlan.id,
          status: "pending",
          current_period_start: now,
          current_period_end: periodEnd(visiblePlan.billing_interval),
          metadata: { activation: "customer_self_service_pending_payment" },
        }).select("id").single();
        if (createError || !created) throw createError ?? new Error("Subscription creation failed");
        subscriptionId = created.id;
      }
    }

    const { data: subscription, error } = await supabase.from("customer_subscriptions")
      .select("id,organization_id,customer_user_id,status,provider,provider_customer_id,provider_first_payment_id,customer_subscription_plans(id,name,price,currency,billing_interval)")
      .eq("id", subscriptionId).single();
    if (error || !subscription) return json({ error: "Subscription not found" }, 404);
    if (subscription.customer_user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!["pending", "past_due"].includes(subscription.status)) return json({ error: "Subscription cannot start payment" }, 409);

    const plan: any = subscription.customer_subscription_plans;
    if (!plan || Number(plan.price) < 0.01) return json({ error: "Subscription plan is not payable" }, 409);

    let customerId = subscription.provider_customer_id;
    if (!customerId) {
      const customerResponse = await fetch("https://api.mollie.com/v2/customers", {
        method: "POST",
        headers: mollieHeaders(),
        body: JSON.stringify({
          name: user.user_metadata?.full_name || user.email || "FitConnect klant",
          email: user.email,
          metadata: { organization_id: subscription.organization_id, customer_user_id: user.id },
        }),
      });
      if (!customerResponse.ok) throw new Error(`Mollie customer creation failed: ${customerResponse.status}`);
      const customer = await customerResponse.json();
      customerId = customer.id;
      const { error: updateError } = await supabase.from("customer_subscriptions").update({
        provider: "mollie",
        provider_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }).eq("id", subscription.id).eq("customer_user_id", user.id);
      if (updateError) throw updateError;
    }

    if (subscription.provider_first_payment_id) {
      const previous = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(subscription.provider_first_payment_id)}`, { headers: mollieHeaders() });
      if (previous.ok) {
        const payment = await previous.json();
        const url = payment?._links?.checkout?.href;
        if (url && ["open", "pending"].includes(payment.status)) {
          return json({ checkoutUrl: url, paymentId: payment.id, subscriptionId: subscription.id, reused: true });
        }
      }
    }

    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/subscription-mollie-webhook`;
    const redirectBase = (Deno.env.get("SUBSCRIPTION_RETURN_URL") || requiredEnv("CHECKOUT_RETURN_URL")).replace(/\/$/, "");
    const paymentResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: mollieHeaders(),
      body: JSON.stringify({
        amount: { currency: String(plan.currency || "EUR").toUpperCase(), value: Number(plan.price).toFixed(2) },
        customerId,
        sequenceType: "first",
        description: `FitConnect ${plan.name}`,
        redirectUrl: `${redirectBase}/?subscription=${encodeURIComponent(subscription.id)}`,
        webhookUrl,
        metadata: {
          purpose: "subscription_first",
          organization_id: subscription.organization_id,
          customer_user_id: user.id,
          subscription_id: subscription.id,
          plan_id: plan.id,
        },
      }),
    });
    if (!paymentResponse.ok) throw new Error(`Mollie first payment failed: ${paymentResponse.status}`);
    const payment = await paymentResponse.json();
    const { error: saveError } = await supabase.from("customer_subscriptions").update({
      provider: "mollie",
      provider_customer_id: customerId,
      provider_first_payment_id: payment.id,
      provider_last_payment_id: payment.id,
      provider_last_event_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", subscription.id).eq("customer_user_id", user.id);
    if (saveError) throw saveError;
    return json({ checkoutUrl: payment?._links?.checkout?.href, paymentId: payment.id, subscriptionId: subscription.id });
  } catch (error) {
    console.error("subscription-mollie-start", error instanceof Error ? error.message : "unknown");
    return json({ error: "Subscription payment could not be started" }, 500);
  }
});
