import { corsHeaders, json } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);
    const supabase = adminClient();
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Invalid session" }, 401);
    const { orderId } = await request.json();
    if (!uuidPattern.test(orderId ?? "")) return json({ error: "Invalid order reference" }, 400);

    const { data: order, error: orderError } = await supabase.from("commerce_checkout_sessions").select("id,user_id").eq("id", orderId).single();
    if (orderError || !order || order.user_id !== auth.user.id) return json({ error: "Invoice not found" }, 404);
    const { data: invoice, error: invoiceError } = await supabase.from("commerce_invoices").select("invoice_number,pdf_path").eq("checkout_session_id", order.id).eq("status", "issued").single();
    if (invoiceError || !invoice?.pdf_path) return json({ error: "Invoice not available" }, 404);
    const { data: signed, error: signedError } = await supabase.storage.from("commerce-invoices").createSignedUrl(invoice.pdf_path, 60, { download: `${invoice.invoice_number}.pdf` });
    if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Signed invoice URL unavailable");
    return json({ invoiceNumber: invoice.invoice_number, url: signed.signedUrl, expiresIn: 60 });
  } catch (error) {
    console.error("commerce-download-invoice", error);
    return json({ error: "Invoice download failed" }, 500);
  }
});
