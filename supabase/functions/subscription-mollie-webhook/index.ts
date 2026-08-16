import { json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

const paymentPattern = /^tr_[A-Za-z0-9]+$/;
const mollieHeaders = () => ({ Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`, "Content-Type": "application/json" });
const intervals: Record<string,string> = { month: "1 month", quarter: "3 months", year: "12 months" };
const addPeriod = (from: Date, interval: string) => { const d = new Date(from); if (interval === "month") d.setUTCMonth(d.getUTCMonth()+1); else if (interval === "quarter") d.setUTCMonth(d.getUTCMonth()+3); else d.setUTCFullYear(d.getUTCFullYear()+1); return d; };

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const id = contentType.includes("application/json") ? (await request.json()).id : new URLSearchParams(await request.text()).get("id");
    if (!id || !paymentPattern.test(id)) return json({ error: "Invalid payment id" }, 400);
    const verify = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, { headers: mollieHeaders() });
    if (!verify.ok) return json({ error: "Payment verification failed" }, 502);
    const payment = await verify.json();
    const subscriptionId = payment.metadata?.subscription_id;
    const organizationId = payment.metadata?.organization_id;
    if (!subscriptionId || !organizationId || !["subscription_first","subscription_recurring"].includes(payment.metadata?.purpose)) return json({ received: true, ignored: true });

    const supabase = adminClient();
    const { data: subscription, error } = await supabase.from("customer_subscriptions")
      .select("id,organization_id,customer_user_id,status,provider_customer_id,provider_subscription_id,provider_mandate_id,provider_first_payment_id,current_period_start,current_period_end,customer_subscription_plans(id,name,price,currency,billing_interval,credits_per_cycle)")
      .eq("id", subscriptionId).eq("organization_id", organizationId).single();
    if (error || !subscription) return json({ error: "Unknown subscription" }, 404);
    const plan: any = subscription.customer_subscription_plans;
    if (!plan || Number(payment.amount?.value) !== Number(plan.price) || payment.amount?.currency !== String(plan.currency).toUpperCase()) return json({ error: "Payment amount mismatch" }, 409);
    if (payment.customerId && subscription.provider_customer_id && payment.customerId !== subscription.provider_customer_id) return json({ error: "Provider customer mismatch" }, 409);

    const eventId = `mollie:${id}:${payment.status}:${payment.paidAt ?? payment.canceledAt ?? payment.expiresAt ?? "current"}`;
    const { data: existing } = await supabase.from("customer_subscription_provider_events").select("id,processed_at").eq("provider","mollie").eq("provider_event_id",eventId).maybeSingle();
    if (existing?.processed_at) return json({ received: true, duplicate: true });
    let event = existing;
    if (!event) { const r = await supabase.from("customer_subscription_provider_events").insert({ organization_id: organizationId, subscription_id: subscription.id, provider: "mollie", event_type: `payment.${payment.status}`, provider_event_id: eventId, provider_payment_id: id, provider_mandate_id: payment.mandateId ?? null, provider_subscription_id: payment.subscriptionId ?? null, payload: payment }).select("id,processed_at").single(); if (r.error) throw r.error; event = r.data; }

    const now = new Date();
    if (payment.status === "paid") {
      let mandateId = payment.mandateId || subscription.provider_mandate_id;
      if (!mandateId && payment.customerId) {
        const mandates = await fetch(`https://api.mollie.com/v2/customers/${encodeURIComponent(payment.customerId)}/mandates`, { headers: mollieHeaders() });
        if (mandates.ok) { const m = await mandates.json(); mandateId = m?._embedded?.mandates?.find((x:any)=>x.status==="valid")?.id || null; }
      }
      let providerSubscriptionId = subscription.provider_subscription_id;
      if (payment.metadata?.purpose === "subscription_first" && !providerSubscriptionId) {
        if (!payment.customerId || !mandateId) throw new Error("Verified first payment has no valid mandate");
        const create = await fetch(`https://api.mollie.com/v2/customers/${encodeURIComponent(payment.customerId)}/subscriptions`, { method:"POST", headers:mollieHeaders(), body:JSON.stringify({ amount:{ currency:String(plan.currency).toUpperCase(), value:Number(plan.price).toFixed(2) }, interval:intervals[plan.billing_interval], description:`FitConnect ${plan.name}`, mandateId, webhookUrl:`${requiredEnv("SUPABASE_URL")}/functions/v1/subscription-mollie-webhook`, metadata:{ purpose:"subscription_recurring", organization_id:organizationId, customer_user_id:subscription.customer_user_id, subscription_id:subscription.id, plan_id:plan.id } }) });
        if (!create.ok) throw new Error(`Mollie subscription creation failed: ${create.status}`); const created = await create.json(); providerSubscriptionId = created.id;
      }
      const start = now, end = addPeriod(start, plan.billing_interval);
      const { error: updateError } = await supabase.from("customer_subscriptions").update({ status:"active", provider:"mollie", provider_customer_id:payment.customerId || subscription.provider_customer_id, provider_mandate_id:mandateId, provider_mandate_status:"valid", provider_subscription_id:providerSubscriptionId, provider_last_payment_id:id, provider_last_event_at:now.toISOString(), current_period_start:start.toISOString(), current_period_end:end.toISOString(), updated_at:now.toISOString() }).eq("id",subscription.id).eq("organization_id",organizationId); if (updateError) throw updateError;
      if (Number(plan.credits_per_cycle) > 0) {
        const { data: wallet, error: walletError } = await supabase.from("customer_wallets").upsert({ organization_id:organizationId, customer_user_id:subscription.customer_user_id, currency:String(plan.currency).toUpperCase(), updated_at:now.toISOString() },{onConflict:"organization_id,customer_user_id,currency"}).select("id").single(); if (walletError) throw walletError;
        const key=`subscription:${subscription.id}:payment:${id}`; const { error: creditError }=await supabase.from("customer_wallet_ledger").upsert({ wallet_id:wallet.id, organization_id:organizationId, customer_user_id:subscription.customer_user_id, entry_type:"subscription_credit", amount:Number(plan.credits_per_cycle), currency:String(plan.currency).toUpperCase(), reference_type:"customer_subscription", reference_id:subscription.id, description:`${plan.name} abonnementstegoed`, idempotency_key:key },{onConflict:"organization_id,idempotency_key",ignoreDuplicates:true}); if(creditError) throw creditError;
      }
    } else if (["failed","canceled","expired"].includes(payment.status)) {
      const nextStatus = subscription.status === "pending" ? "pending" : "past_due";
      const { error: updateError } = await supabase.from("customer_subscriptions").update({ status:nextStatus, provider_last_payment_id:id, provider_last_event_at:now.toISOString(), updated_at:now.toISOString() }).eq("id",subscription.id).eq("organization_id",organizationId); if(updateError) throw updateError;
    }
    const { error: doneError }=await supabase.from("customer_subscription_provider_events").update({ processed_at:new Date().toISOString() }).eq("id",event.id); if(doneError) throw doneError;
    return json({ received:true });
  } catch (error) { console.error("subscription-mollie-webhook",error instanceof Error?error.message:"unknown"); return json({ error:"Subscription webhook processing failed" },500); }
});