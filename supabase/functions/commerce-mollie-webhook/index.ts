import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { sendPaidOrderEmail } from "../_shared/order-email.ts";
import { ensureInvoice } from "../_shared/invoice.ts";
import { createInvoicePdf } from "../_shared/invoice-pdf.ts";

const statusMap: Record<string, string> = { open: "pending", pending: "pending", authorized: "authorized", paid: "paid", failed: "failed", canceled: "cancelled", expired: "expired" };
const money = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const id = contentType.includes("application/json") ? (await request.json()).id : new URLSearchParams(await request.text()).get("id");
    if (!id || !/^tr_[A-Za-z0-9]+$/.test(id)) return json({ error: "Invalid payment id" }, 400);

    const response = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}` },
    });
    if (!response.ok) return json({ error: "Payment verification failed" }, 502);
    const mollie = await response.json();
    const mappedStatus = statusMap[mollie.status];
    if (!mappedStatus) return json({ received: true, ignored: true });

    const supabase = adminClient();
    const { data: payment, error: paymentError } = await supabase
      .from("commerce_payments")
      .select("id,organization_id,checkout_session_id,amount,currency,status,paid_at")
      .eq("provider", "mollie")
      .eq("provider_payment_id", id)
      .single();
    if (paymentError || !payment) return json({ error: "Unknown payment" }, 404);

    if (Number(mollie.amount?.value) !== Number(payment.amount) || mollie.amount?.currency !== payment.currency) {
      return json({ error: "Payment amount mismatch" }, 409);
    }
    if (mollie.metadata?.checkout_session_id !== payment.checkout_session_id || mollie.metadata?.organization_id !== payment.organization_id) {
      return json({ error: "Payment metadata mismatch" }, 409);
    }

    const eventId = `mollie:${id}:${mollie.status}:${mollie.paidAt ?? mollie.canceledAt ?? mollie.expiresAt ?? "current"}`;
    const { data: existingEvent } = await supabase
      .from("commerce_payment_events")
      .select("id,processing_status")
      .eq("provider", "mollie")
      .eq("provider_event_id", eventId)
      .maybeSingle();
    if (existingEvent?.processing_status === "processed") return json({ received: true, duplicate: true });

    let currentEvent = existingEvent;
    if (!currentEvent) {
      const { data: insertedEvent, error: eventError } = await supabase
        .from("commerce_payment_events")
        .insert({
          organization_id: payment.organization_id,
          payment_id: payment.id,
          provider: "mollie",
          provider_event_id: eventId,
          event_type: `payment.${mollie.status}`,
          payload: mollie,
          processing_status: "received",
        })
        .select("id,processing_status")
        .single();
      if (eventError) throw eventError;
      currentEvent = insertedEvent;
    }

    const { error: rpcError } = await supabase.rpc("commerce_record_payment_status", {
      p_payment_id: payment.id,
      p_status: mappedStatus,
      p_source: "mollie_webhook",
      p_event_id: currentEvent.id,
    });
    if (rpcError) throw rpcError;

    if (mappedStatus === "paid") {
      const { data: order, error: orderError } = await supabase
        .from("commerce_checkout_sessions")
        .select("id,cart_id,first_name,last_name,email,phone,company_name,subtotal,tax_total,grand_total,currency,shipping_address,billing_address")
        .eq("id", payment.checkout_session_id)
        .single();
      if (orderError) throw orderError;

      const [{ data: items, error: itemError }, { data: cart, error: cartError }, { data: linkedInvoice, error: linkedInvoiceError }] = await Promise.all([
        supabase.from("commerce_cart_items").select("product_name,quantity,unit_price,tax_rate").eq("cart_id", order.cart_id).order("created_at"),
        supabase.from("commerce_carts").select("metadata").eq("id", order.cart_id).single(),
        supabase.from("commerce_invoices").select("*").eq("payment_id", payment.id).maybeSingle(),
      ]);
      if (itemError) throw itemError;
      if (cartError) throw cartError;
      if (linkedInvoiceError) throw linkedInvoiceError;

      let invoiceResult: { invoice: any; pdf: Uint8Array };
      if (linkedInvoice?.source_channel === "quote") {
        const normalizedLines = (items ?? []).map((item: any) => {
          const netTotal = money(Number(item.unit_price) * Number(item.quantity));
          const taxTotal = money(netTotal * Number(item.tax_rate) / 100);
          return {
            description: item.product_name,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            tax_rate: Number(item.tax_rate),
            net_total: netTotal,
            tax_total: taxTotal,
            gross_total: money(netTotal + taxTotal),
          };
        });
        const paidAt = payment.paid_at ?? mollie.paidAt ?? new Date().toISOString();
        const { data: paidInvoice, error: paidInvoiceError } = await supabase
          .from("commerce_invoices")
          .update({
            status: "paid",
            payment_status: "paid",
            payment_method: "payment_link",
            paid_at: paidAt,
            line_snapshot: normalizedLines,
            updated_at: new Date().toISOString(),
          })
          .eq("id", linkedInvoice.id)
          .select("*")
          .single();
        if (paidInvoiceError || !paidInvoice) throw paidInvoiceError ?? new Error("Quote invoice payment update failed");

        let pdf: Uint8Array;
        if (paidInvoice.pdf_path) {
          const { data: stored, error: downloadError } = await supabase.storage.from("commerce-invoices").download(paidInvoice.pdf_path);
          if (downloadError || !stored) throw downloadError ?? new Error("Stored quote invoice PDF is unavailable");
          pdf = new Uint8Array(await stored.arrayBuffer());
        } else {
          pdf = await createInvoicePdf(paidInvoice);
          const path = `${payment.organization_id}/${paidInvoice.invoice_number}.pdf`;
          const { error: uploadError } = await supabase.storage.from("commerce-invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
          if (uploadError) throw uploadError;
          const { error: pathError } = await supabase.from("commerce_invoices").update({ pdf_path: path, updated_at: new Date().toISOString() }).eq("id", paidInvoice.id);
          if (pathError) throw pathError;
          paidInvoice.pdf_path = path;
        }
        invoiceResult = { invoice: paidInvoice, pdf };
      } else {
        invoiceResult = await ensureInvoice({
          supabase,
          payment: { ...payment, paid_at: payment.paid_at ?? mollie.paidAt },
          order,
          cartMetadata: cart?.metadata,
          items: items ?? [],
        });
      }

      const { data: delivery } = await supabase
        .from("commerce_email_deliveries")
        .select("status")
        .eq("checkout_session_id", order.id)
        .eq("email_type", "order_paid")
        .maybeSingle();

      if (delivery?.status !== "sent") {
        const { error: pendingError } = await supabase.from("commerce_email_deliveries").upsert({
          organization_id: payment.organization_id,
          checkout_session_id: order.id,
          email_type: "order_paid",
          recipient: order.email,
          status: "sending",
          last_error: null,
        }, { onConflict: "checkout_session_id,email_type" });
        if (pendingError) throw pendingError;

        try {
          const providerMessageId = await sendPaidOrderEmail({
            ...order,
            items: items ?? [],
            invoice: { invoice_number: invoiceResult.invoice.invoice_number, pdf: invoiceResult.pdf },
          });
          const { error: sentError } = await supabase.from("commerce_email_deliveries").update({
            status: "sent",
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString(),
            last_error: null,
          }).eq("checkout_session_id", order.id).eq("email_type", "order_paid");
          if (sentError) throw sentError;
        } catch (emailError) {
          await supabase.from("commerce_email_deliveries").update({
            status: "failed",
            last_error: emailError instanceof Error ? emailError.message : "Unknown email error",
          }).eq("checkout_session_id", order.id).eq("email_type", "order_paid");
          throw emailError;
        }
      }
    }

    await supabase.from("commerce_payment_events").update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
    }).eq("id", currentEvent.id);
    return json({ received: true });
  } catch (error) {
    console.error("commerce-mollie-webhook", error instanceof Error ? error.message : "unknown");
    return json({ error: "Webhook processing failed" }, 500);
  }
});
