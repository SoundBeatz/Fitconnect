import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { sendPaidOrderEmail } from "../_shared/order-email.ts";
import { ensureInvoice } from "../_shared/invoice.ts";

const statusMap: Record<string, string> = { open: "pending", pending: "pending", authorized: "authorized", paid: "paid", failed: "failed", canceled: "cancelled", expired: "expired" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const id = contentType.includes("application/json") ? (await request.json()).id : new URLSearchParams(await request.text()).get("id");
    if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) return json({ error: "Invalid payment id" }, 400);
    const response = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}` } });
    if (!response.ok) return json({ error: "Payment verification failed" }, 502);
    const mollie = await response.json();
    const mappedStatus = statusMap[mollie.status];
    if (!mappedStatus) return json({ received: true, ignored: true });

    const supabase = adminClient();
    const { data: payment, error: paymentError } = await supabase.from("commerce_payments").select("id,organization_id,checkout_session_id,amount,currency,status,paid_at").eq("provider", "mollie").eq("provider_payment_id", id).single();
    if (paymentError || !payment) return json({ error: "Unknown payment" }, 404);
    if (Number(mollie.amount?.value) !== Number(payment.amount) || mollie.amount?.currency !== payment.currency) return json({ error: "Payment amount mismatch" }, 409);

    const eventId = `mollie:${id}:${mollie.status}:${mollie.paidAt ?? mollie.canceledAt ?? mollie.expiresAt ?? "current"}`;
    const { data: event, error: eventError } = await supabase.from("commerce_payment_events").upsert({ organization_id: payment.organization_id, payment_id: payment.id, provider: "mollie", provider_event_id: eventId, event_type: `payment.${mollie.status}`, payload: mollie, processing_status: "received" }, { onConflict: "provider,provider_event_id", ignoreDuplicates: true }).select("id,processing_status").maybeSingle();
    if (eventError) throw eventError;
    let currentEvent = event;
    if (!currentEvent) {
      const { data: existingEvent, error: existingEventError } = await supabase.from("commerce_payment_events").select("id,processing_status").eq("provider", "mollie").eq("provider_event_id", eventId).single();
      if (existingEventError) throw existingEventError;
      currentEvent = existingEvent;
    }

    const { error: rpcError } = await supabase.rpc("commerce_record_payment_status", { p_payment_id: payment.id, p_status: mappedStatus, p_source: "mollie_webhook", p_event_id: currentEvent.id });
    if (rpcError) throw rpcError;
    if (mappedStatus === "paid") {
      const { data: order, error: orderError } = await supabase.from("commerce_checkout_sessions").select("id,cart_id,first_name,last_name,email,phone,company_name,subtotal,tax_total,grand_total,currency,shipping_address,billing_address").eq("id", payment.checkout_session_id).single();
      if (orderError) throw orderError;
      const [{ data: items, error: itemError }, { data: cart, error: cartError }] = await Promise.all([
        supabase.from("commerce_cart_items").select("product_name,quantity,unit_price,tax_rate").eq("cart_id", order.cart_id).order("created_at"),
        supabase.from("commerce_carts").select("metadata").eq("id", order.cart_id).single(),
      ]);
      if (itemError) throw itemError;
      if (cartError) throw cartError;
      const invoiceResult = await ensureInvoice({ supabase, payment: { ...payment, paid_at: payment.paid_at ?? mollie.paidAt }, order, cartMetadata: cart?.metadata, items: items ?? [] });
      const { data: delivery } = await supabase.from("commerce_email_deliveries").select("status").eq("checkout_session_id", order.id).eq("email_type", "order_paid").maybeSingle();
      if (delivery?.status !== "sent") {
        const { error: pendingError } = await supabase.from("commerce_email_deliveries").upsert({ organization_id: payment.organization_id, checkout_session_id: order.id, email_type: "order_paid", recipient: order.email, status: "sending", last_error: null }, { onConflict: "checkout_session_id,email_type" });
        if (pendingError) throw pendingError;
        try {
          const providerMessageId = await sendPaidOrderEmail({ ...order, items: items ?? [], invoice: { invoice_number: invoiceResult.invoice.invoice_number, pdf: invoiceResult.pdf } });
          const { error: sentError } = await supabase.from("commerce_email_deliveries").update({ status: "sent", provider_message_id: providerMessageId, sent_at: new Date().toISOString(), last_error: null }).eq("checkout_session_id", order.id).eq("email_type", "order_paid");
          if (sentError) throw sentError;
        } catch (emailError) {
          await supabase.from("commerce_email_deliveries").update({ status: "failed", last_error: emailError instanceof Error ? emailError.message : "Unknown email error" }).eq("checkout_session_id", order.id).eq("email_type", "order_paid");
          throw emailError;
        }
      }
    }
    await supabase.from("commerce_payment_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("id", currentEvent.id);
    return json({ received: true });
  } catch (error) {
    console.error("commerce-mollie-webhook", error);
    return json({ error: "Webhook processing failed" }, 500);
  }
});
