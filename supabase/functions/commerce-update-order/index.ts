import { corsHeaders, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { sendShippedOrderEmail } from "../_shared/order-email.ts";

const statuses = new Set(["processing", "confirmed", "picking", "packed", "shipped", "delivered", "cancelled", "returned"]);
const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max) || null;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);
    const supabase = adminClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Invalid session" }, 401);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    if (profile?.role !== "admin") return json({ error: "Administrator access required" }, 403);

    const body = await request.json();
    const orderId = clean(body.orderId, 36);
    const orderStatus = clean(body.orderStatus, 32);
    if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId) || !orderStatus || !statuses.has(orderStatus)) return json({ error: "Invalid order update" }, 400);
    const carrier = clean(body.trackingCarrier);
    const trackingCode = clean(body.trackingCode);
    const trackingUrl = clean(body.trackingUrl, 500);
    if (orderStatus === "shipped" && (!carrier || !trackingCode)) return json({ error: "Carrier and tracking code are required" }, 400);
    if (trackingUrl && !/^https:\/\//i.test(trackingUrl)) return json({ error: "Tracking URL must use HTTPS" }, 400);

    const { data: order, error: orderError } = await supabase.from("commerce_checkout_sessions")
      .select("id,organization_id,cart_id,first_name,email,order_status,tracking_carrier,tracking_code,tracking_url,shipped_at,delivered_at")
      .eq("id", orderId).single();
    if (orderError || !order) return json({ error: "Order not found" }, 404);

    const now = new Date().toISOString();
    const patch = {
      order_status: orderStatus,
      tracking_carrier: carrier,
      tracking_code: trackingCode,
      tracking_url: trackingUrl,
      shipped_at: ["shipped", "delivered"].includes(orderStatus) ? (order.shipped_at ?? now) : order.shipped_at,
      delivered_at: orderStatus === "delivered" ? (order.delivered_at ?? now) : order.delivered_at,
      updated_at: now,
    };
    const { error: updateError } = await supabase.from("commerce_checkout_sessions").update(patch).eq("id", order.id);
    if (updateError) throw updateError;
    const changed = order.order_status !== orderStatus || order.tracking_carrier !== carrier || order.tracking_code !== trackingCode || order.tracking_url !== trackingUrl;
    if (changed) {
      const { error: historyError } = await supabase.from("commerce_order_status_history").insert({ organization_id: order.organization_id, checkout_session_id: order.id, from_status: order.order_status, to_status: orderStatus, tracking_carrier: carrier, tracking_code: trackingCode, changed_by: auth.user.id });
      if (historyError) throw historyError;
    }

    let emailSent = false;
    if (orderStatus === "shipped") {
      const { data: delivery } = await supabase.from("commerce_email_deliveries").select("status").eq("checkout_session_id", order.id).eq("email_type", "order_shipped").maybeSingle();
      if (delivery?.status !== "sent") {
        await supabase.from("commerce_email_deliveries").upsert({ organization_id: order.organization_id, checkout_session_id: order.id, email_type: "order_shipped", recipient: order.email, status: "sending", last_error: null }, { onConflict: "checkout_session_id,email_type" });
        try {
          const messageId = await sendShippedOrderEmail({ id: order.id, first_name: order.first_name, email: order.email, tracking_carrier: carrier!, tracking_code: trackingCode!, tracking_url: trackingUrl });
          const { error: emailUpdateError } = await supabase.from("commerce_email_deliveries").update({ status: "sent", provider_message_id: messageId, sent_at: now, last_error: null }).eq("checkout_session_id", order.id).eq("email_type", "order_shipped");
          if (emailUpdateError) throw emailUpdateError;
          emailSent = true;
        } catch (emailError) {
          await supabase.from("commerce_email_deliveries").update({ status: "failed", last_error: emailError instanceof Error ? emailError.message : "Unknown email error" }).eq("checkout_session_id", order.id).eq("email_type", "order_shipped");
          throw emailError;
        }
      }
    }
    return json({ updated: true, emailSent });
  } catch (error) {
    console.error("commerce-update-order", error);
    return json({ error: "Order update failed" }, 500);
  }
});
