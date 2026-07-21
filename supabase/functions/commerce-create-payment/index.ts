import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";

type CartItem = { productId?: string; quantity?: number };
type CheckoutBody = {
  items?: CartItem[];
  customer?: { firstName?: string; lastName?: string; email?: string; phone?: string };
  shippingAddress?: { street?: string; postalCode?: string; city?: string; country?: string };
  idempotencyKey?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await request.json() as CheckoutBody;
    const customer = body.customer ?? {};
    const address = body.shippingAddress ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const idempotencyKey = body.idempotencyKey?.trim();

    if (!idempotencyKey || !uuidPattern.test(idempotencyKey)) return json({ error: "Ongeldige checkoutreferentie." }, 400);
    if (!customer.firstName?.trim() || !customer.lastName?.trim() || !/^\S+@\S+\.\S+$/.test(customer.email ?? "")) return json({ error: "Vul geldige contactgegevens in." }, 400);
    if (!address.street?.trim() || !address.postalCode?.trim() || !address.city?.trim()) return json({ error: "Vul een volledig leveradres in." }, 400);
    if (!rawItems.length || rawItems.length > 100) return json({ error: "De winkelmand is leeg of te groot." }, 400);

    const quantities = new Map<string, number>();
    for (const item of rawItems) {
      const quantity = Number(item.quantity);
      if (!item.productId || !uuidPattern.test(item.productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return json({ error: "De winkelmand bevat een ongeldig artikel." }, 400);
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + quantity);
    }

    const supabase = adminClient();
    const organizationId = requiredEnv("FITCONNECT_ORGANIZATION_ID");
    const { data: existing } = await supabase.from("commerce_checkout_sessions").select("id,commerce_payments(id,checkout_url,status)").eq("idempotency_key", idempotencyKey).maybeSingle();
    const previousPayment = Array.isArray(existing?.commerce_payments) ? existing.commerce_payments[0] : existing?.commerce_payments;
    if (previousPayment?.checkout_url && ["created", "pending"].includes(previousPayment.status)) return json({ checkoutUrl: previousPayment.checkout_url, checkoutSessionId: existing?.id });

    const ids = [...quantities.keys()];
    const { data: products, error: productError } = await supabase.from("products").select("id,name,price,vat,status").in("id", ids).eq("status", "active");
    if (productError) throw productError;
    if (!products || products.length !== ids.length) return json({ error: "Een artikel is niet meer beschikbaar. Vernieuw de winkelmand." }, 409);

    const lines = products.map((product) => {
      const quantity = quantities.get(product.id)!;
      const grossUnit = money(Number(product.price));
      const vat = Number(product.vat ?? 21);
      const netUnit = money(grossUnit / (1 + vat / 100));
      return { product, quantity, grossUnit, netUnit, vat };
    });
    const subtotal = money(lines.reduce((sum, line) => sum + line.netUnit * line.quantity, 0));
    const grandTotal = money(lines.reduce((sum, line) => sum + line.grossUnit * line.quantity, 0));
    const taxTotal = money(grandTotal - subtotal);
    if (grandTotal < 0.01 || grandTotal > 100000) return json({ error: "Het orderbedrag kan niet worden verwerkt." }, 400);

    const { data: cart, error: cartError } = await supabase.from("commerce_carts").insert({ organization_id: organizationId, status: "checkout", currency: "EUR", customer_email: customer.email!.trim().toLowerCase() }).select("id").single();
    if (cartError) throw cartError;
    const { error: lineError } = await supabase.from("commerce_cart_items").insert(lines.map((line) => ({ cart_id: cart.id, product_id: line.product.id, quantity: line.quantity, unit_price: line.netUnit, tax_rate: line.vat, product_name: line.product.name })));
    if (lineError) throw lineError;

    const { data: session, error: sessionError } = await supabase.from("commerce_checkout_sessions").insert({ organization_id: organizationId, cart_id: cart.id, status: "processing", email: customer.email!.trim().toLowerCase(), first_name: customer.firstName!.trim(), last_name: customer.lastName!.trim(), phone: customer.phone?.trim() || null, shipping_address: { street: address.street!.trim(), postal_code: address.postalCode!.trim(), city: address.city!.trim(), country: address.country ?? "NL" }, billing_address: { street: address.street!.trim(), postal_code: address.postalCode!.trim(), city: address.city!.trim(), country: address.country ?? "NL" }, subtotal, tax_total: taxTotal, grand_total: grandTotal, currency: "EUR", selected_payment_provider: "mollie", idempotency_key: idempotencyKey }).select("id").single();
    if (sessionError) throw sessionError;

    const redirectBase = requiredEnv("CHECKOUT_RETURN_URL").replace(/\/$/, "");
    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/commerce-mollie-webhook`;
    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", { method: "POST", headers: { Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ amount: { currency: "EUR", value: grandTotal.toFixed(2) }, description: `FitConnect bestelling ${session.id.slice(0, 8)}`, redirectUrl: `${redirectBase}?checkout=${session.id}`, webhookUrl, metadata: { checkout_session_id: session.id, organization_id: organizationId } }) });
    const mollie = await mollieResponse.json();
    if (!mollieResponse.ok || !mollie.id || !mollie._links?.checkout?.href) throw new Error(`Mollie payment creation failed: ${mollieResponse.status}`);

    const { error: paymentError } = await supabase.from("commerce_payments").insert({ organization_id: organizationId, checkout_session_id: session.id, provider: "mollie", provider_payment_id: mollie.id, status: mollie.status === "open" ? "pending" : "created", amount: grandTotal, currency: "EUR", checkout_url: mollie._links.checkout.href, provider_payload: mollie });
    if (paymentError) throw paymentError;
    return json({ checkoutUrl: mollie._links.checkout.href, checkoutSessionId: session.id }, 201);
  } catch (error) {
    console.error("commerce-create-payment", error);
    return json({ error: "De betaling kon niet worden gestart. Probeer het opnieuw." }, 500);
  }
});
