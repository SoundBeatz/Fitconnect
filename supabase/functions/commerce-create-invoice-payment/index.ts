import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { cleanText, normalizeEmail, normalizePhone, validEmail } from "../_shared/validation.ts";
import { consumeRateLimit } from "../_shared/payment-security.ts";

type Body = { invoiceId?: string; idempotencyKey?: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money = (value: unknown) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let phase = "AUTH";
  try {
    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!accessToken) return json({ error: "Authentication required" }, 401);

    const supabase = adminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Authentication required" }, 401);

    const body = await request.json() as Body;
    const invoiceId = cleanText(body.invoiceId, 64);
    const idempotencyKey = cleanText(body.idempotencyKey, 64);
    if (!uuidPattern.test(invoiceId) || !uuidPattern.test(idempotencyKey)) return json({ error: "Invalid payment request" }, 400);

    const rate = await consumeRateLimit(supabase, "invoice_payment_user", user.id, 8, 600);
    if (!rate.allowed) return json({ error: "Te veel betaalpogingen. Probeer het later opnieuw." }, 429, { "retry-after": String(Math.max(rate.retryAfterSeconds, 1)) });

    phase = "INVOICE";
    const { data: invoice, error: invoiceError } = await supabase
      .from("commerce_invoices")
      .select("id,organization_id,invoice_number,status,payment_status,currency,subtotal,tax_total,grand_total,customer_snapshot,line_snapshot,checkout_session_id,payment_id,source_channel")
      .eq("id", invoiceId)
      .single();
    if (invoiceError || !invoice) return json({ error: "Factuur niet gevonden" }, 404);

    const { data: quote, error: quoteError } = await supabase
      .from("commerce_quotes")
      .select("id,portal_user_id,status")
      .eq("invoice_id", invoice.id)
      .eq("portal_user_id", user.id)
      .single();
    if (quoteError || !quote) return json({ error: "Geen toegang tot deze factuur" }, 403);
    if (invoice.source_channel !== "quote") return json({ error: "Deze betaallink is alleen voor offertefacturen" }, 409);
    if (invoice.payment_status === "paid" || invoice.status === "paid") return json({ paid: true, invoiceId: invoice.id });
    if (!["issued", "sent", "overdue"].includes(invoice.status)) return json({ error: "Factuur is niet betaalbaar" }, 409);

    if (invoice.payment_id) {
      const { data: existingPayment } = await supabase
        .from("commerce_payments")
        .select("id,status,checkout_url,provider_payment_id")
        .eq("id", invoice.payment_id)
        .maybeSingle();
      if (existingPayment?.checkout_url && ["created", "pending", "authorized"].includes(existingPayment.status)) {
        return json({ checkoutUrl: existingPayment.checkout_url, invoiceId: invoice.id, paymentId: existingPayment.id });
      }
    }

    const customer = invoice.customer_snapshot ?? {};
    const email = normalizeEmail(customer.email);
    const country = cleanText(customer.country, 2).toUpperCase() || "NL";
    const phone = normalizePhone(customer.phone, country);
    const firstName = cleanText(customer.first_name || customer.contact_name || customer.name || customer.company, 80);
    const lastName = cleanText(customer.last_name || (customer.company ? "Zakelijk" : "Klant"), 80);
    if (!validEmail(email) || !firstName || !lastName) return json({ error: "Factuur mist geldige klantgegevens" }, 409);

    let checkoutSessionId = invoice.checkout_session_id as string | null;
    let cartId: string | null = null;

    if (!checkoutSessionId) {
      phase = "CART";
      const { data: cart, error: cartError } = await supabase.from("commerce_carts").insert({
        organization_id: invoice.organization_id,
        user_id: user.id,
        status: "checkout",
        currency: invoice.currency,
        customer_email: email,
        metadata: { source: "quote_invoice", invoice_id: invoice.id, quote_id: quote.id },
      }).select("id").single();
      if (cartError) throw cartError;
      cartId = cart.id;

      const lines = Array.isArray(invoice.line_snapshot) ? invoice.line_snapshot : [];
      if (!lines.length) throw new Error("Invoice has no lines");
      const { error: lineError } = await supabase.from("commerce_cart_items").insert(lines.map((line: Record<string, unknown>) => ({
        cart_id: cart.id,
        product_id: uuidPattern.test(String(line.product_id ?? "")) ? line.product_id : null,
        quantity: Number(line.quantity ?? 1),
        unit_price: Number(line.unit_price ?? 0),
        tax_rate: Number(line.tax_rate ?? 21),
        product_name: cleanText(line.description || line.product_name || line.name || "Offerteartikel", 180),
        sku: cleanText(line.sku, 80) || null,
        metadata: { source: "quote_invoice", quote_id: quote.id },
      })));
      if (lineError) throw lineError;

      const address = {
        street: cleanText(customer.street || customer.address, 160),
        house_number: cleanText(customer.house_number, 20),
        postal_code: cleanText(customer.postal_code, 16),
        city: cleanText(customer.city, 100),
        country,
      };

      phase = "SESSION";
      const { data: session, error: sessionError } = await supabase.from("commerce_checkout_sessions").insert({
        organization_id: invoice.organization_id,
        cart_id: cart.id,
        user_id: user.id,
        status: "processing",
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        company_name: cleanText(customer.company, 160) || null,
        billing_address: address,
        shipping_address: address,
        subtotal: money(invoice.subtotal),
        tax_total: money(invoice.tax_total),
        grand_total: money(invoice.grand_total),
        currency: invoice.currency,
        selected_payment_provider: "mollie",
        idempotency_key: idempotencyKey,
      }).select("id").single();
      if (sessionError) throw sessionError;
      checkoutSessionId = session.id;

      const { error: invoiceSessionError } = await supabase.from("commerce_invoices").update({ checkout_session_id: checkoutSessionId, updated_at: new Date().toISOString() }).eq("id", invoice.id).is("checkout_session_id", null);
      if (invoiceSessionError) throw invoiceSessionError;
    }

    phase = "MOLLIE";
    const redirectBase = requiredEnv("CUSTOMER_PORTAL_URL").replace(/\/$/, "");
    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/commerce-mollie-webhook`;
    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: { currency: String(invoice.currency).trim(), value: money(invoice.grand_total).toFixed(2) },
        description: `FitConnect factuur ${invoice.invoice_number}`,
        redirectUrl: `${redirectBase}/quotes/?invoice=${encodeURIComponent(invoice.id)}`,
        webhookUrl,
        metadata: {
          checkout_session_id: checkoutSessionId,
          organization_id: invoice.organization_id,
          invoice_id: invoice.id,
          quote_id: quote.id,
          source: "quote_invoice",
        },
      }),
    });
    const mollie = await mollieResponse.json();
    if (!mollieResponse.ok || !mollie.id || !mollie._links?.checkout?.href) throw new Error(`Mollie payment creation failed: ${mollieResponse.status}`);

    phase = "PAYMENT";
    const { data: payment, error: paymentError } = await supabase.from("commerce_payments").insert({
      organization_id: invoice.organization_id,
      checkout_session_id: checkoutSessionId,
      provider: "mollie",
      provider_payment_id: mollie.id,
      status: mollie.status === "open" ? "pending" : "created",
      amount: money(invoice.grand_total),
      currency: invoice.currency,
      checkout_url: mollie._links.checkout.href,
      provider_payload: mollie,
    }).select("id").single();
    if (paymentError) throw paymentError;

    const { error: linkError } = await supabase.from("commerce_invoices").update({ payment_id: payment.id, payment_method: "payment_link", updated_at: new Date().toISOString() }).eq("id", invoice.id);
    if (linkError) throw linkError;

    return json({ checkoutUrl: mollie._links.checkout.href, invoiceId: invoice.id, paymentId: payment.id }, 201);
  } catch (error) {
    console.error("commerce-create-invoice-payment", { phase, message: error instanceof Error ? error.message : "unknown" });
    return json({ error: `De betaallink kon niet worden aangemaakt (stap ${phase}).` }, 500);
  }
});
