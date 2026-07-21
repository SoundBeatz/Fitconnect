import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { findDutchAddress } from "../_shared/pdok.ts";
import { cleanText, normalizeEmail, normalizePhone, normalizePostalCode, validEmail, validKvkNumber, validPostalCode, validVatNumber } from "../_shared/validation.ts";

type CartItem = { productId?: string; quantity?: number };
type CheckoutBody = {
  items?: CartItem[];
  customer?: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string; chamberOfCommerce?: string; vatNumber?: string; customerType?: string };
  shippingAddress?: { street?: string; houseNumber?: string; postalCode?: string; city?: string; region?: string; country?: string; bagId?: string; verified?: boolean };
  idempotencyKey?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let phase = "VALIDATION";
  let cartId: string | null = null;
  let sessionId: string | null = null;
  try {
    const body = await request.json() as CheckoutBody;
    const customer = body.customer ?? {};
    const address = body.shippingAddress ?? {};
    const rawItems = Array.isArray(body.items) ? body.items : [];
    const idempotencyKey = body.idempotencyKey?.trim();

    if (!idempotencyKey || !uuidPattern.test(idempotencyKey)) return json({ error: "Ongeldige checkoutreferentie." }, 400);
    const country = cleanText(address.country, 2).toUpperCase() || "NL";
    const email = normalizeEmail(customer.email);
    const phone = normalizePhone(customer.phone, country);
    if (!cleanText(customer.firstName) || !cleanText(customer.lastName) || !validEmail(email) || !phone) return json({ error: "Vul geldige contactgegevens in." }, 400);
    if (!validPostalCode(address.postalCode, country) || !cleanText(address.street) || !cleanText(address.houseNumber, 20) || !cleanText(address.city)) return json({ error: "Vul een volledig en geldig leveradres in." }, 400);
    const isBusiness = customer.customerType === "business";
    if (isBusiness && (!cleanText(customer.company) || !validKvkNumber(customer.chamberOfCommerce))) return json({ error: "Vul een geldige bedrijfsnaam en een KVK-nummer van acht cijfers in." }, 400);
    if (!validVatNumber(customer.vatNumber)) return json({ error: "Het btw-nummer heeft geen geldig formaat." }, 400);

    let verifiedAddress = null;
    if (country === "NL") {
      verifiedAddress = await findDutchAddress(address.postalCode, address.houseNumber);
      if (!verifiedAddress) return json({ error: "Het Nederlandse leveradres kon niet in de BAG worden gevonden." }, 400);
      if (cleanText(address.street).toLowerCase() !== verifiedAddress.street.toLowerCase() || cleanText(address.city).toLowerCase() !== verifiedAddress.city.toLowerCase()) return json({ error: "Straat of plaats komt niet overeen met postcode en huisnummer. Zoek het adres opnieuw." }, 400);
    }
    if (!rawItems.length || rawItems.length > 100) return json({ error: "De winkelmand is leeg of te groot." }, 400);

    const quantities = new Map<string, number>();
    for (const item of rawItems) {
      const quantity = Number(item.quantity);
      if (!item.productId || !uuidPattern.test(item.productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return json({ error: "De winkelmand bevat een ongeldig artikel." }, 400);
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + quantity);
    }

    const supabase = adminClient();
    const organizationId = requiredEnv("FITCONNECT_ORGANIZATION_ID");
    phase = "IDEMPOTENCY";
    const { data: existing, error: existingError } = await supabase.from("commerce_checkout_sessions").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existingError) throw existingError;
    let previousPayment = null;
    if (existing?.id) {
      const { data: payment, error: paymentLookupError } = await supabase
        .from("commerce_payments")
        .select("checkout_url,status")
        .eq("checkout_session_id", existing.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (paymentLookupError) throw paymentLookupError;
      previousPayment = payment;
    }
    if (previousPayment?.checkout_url && ["created", "pending"].includes(previousPayment.status)) return json({ checkoutUrl: previousPayment.checkout_url, checkoutSessionId: existing?.id });

    const ids = [...quantities.keys()];
    phase = "PRODUCTS";
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

    const company = cleanText(customer.company) || null;
    const kvkNumber = cleanText(customer.chamberOfCommerce, 20).replace(/\D/g, "") || null;
    const vatNumber = cleanText(customer.vatNumber, 24).replace(/[\s.-]/g, "").toUpperCase() || null;
    phase = "CART";
    const { data: cart, error: cartError } = await supabase.from("commerce_carts").insert({ organization_id: organizationId, status: "checkout", currency: "EUR", customer_email: email, metadata: { customer_type: isBusiness ? "business" : "consumer", company_name: company, kvk_number: kvkNumber, vat_number: vatNumber } }).select("id").single();
    if (cartError) throw cartError;
    cartId = cart.id;
    phase = "ITEMS";
    const { error: lineError } = await supabase.from("commerce_cart_items").insert(lines.map((line) => ({ cart_id: cart.id, product_id: line.product.id, quantity: line.quantity, unit_price: line.netUnit, tax_rate: line.vat, product_name: line.product.name })));
    if (lineError) throw lineError;

    const storedAddress = { street: cleanText(address.street), house_number: cleanText(address.houseNumber, 20), postal_code: normalizePostalCode(address.postalCode, country), city: cleanText(address.city), region: cleanText(address.region), country, verified: country === "NL", bag_id: verifiedAddress?.bagId ?? null };
    phase = "SESSION";
    const { data: session, error: sessionError } = await supabase.from("commerce_checkout_sessions").insert({ organization_id: organizationId, cart_id: cart.id, status: "processing", email, first_name: cleanText(customer.firstName), last_name: cleanText(customer.lastName), phone, company_name: company, shipping_address: storedAddress, billing_address: storedAddress, subtotal, tax_total: taxTotal, grand_total: grandTotal, currency: "EUR", selected_payment_provider: "mollie", idempotency_key: idempotencyKey }).select("id").single();
    if (sessionError) throw sessionError;
    sessionId = session.id;

    const redirectBase = requiredEnv("CHECKOUT_RETURN_URL").replace(/\/$/, "");
    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/commerce-mollie-webhook`;
    phase = "MOLLIE";
    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", { method: "POST", headers: { Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ amount: { currency: "EUR", value: grandTotal.toFixed(2) }, description: `FitConnect bestelling ${session.id.slice(0, 8)}`, redirectUrl: `${redirectBase}?checkout=${session.id}`, webhookUrl, metadata: { checkout_session_id: session.id, organization_id: organizationId } }) });
    const mollie = await mollieResponse.json();
    if (!mollieResponse.ok || !mollie.id || !mollie._links?.checkout?.href) throw new Error(`Mollie payment creation failed: ${mollieResponse.status}`);

    phase = "PAYMENT";
    const { error: paymentError } = await supabase.from("commerce_payments").insert({ organization_id: organizationId, checkout_session_id: session.id, provider: "mollie", provider_payment_id: mollie.id, status: mollie.status === "open" ? "pending" : "created", amount: grandTotal, currency: "EUR", checkout_url: mollie._links.checkout.href, provider_payload: mollie });
    if (paymentError) throw paymentError;
    return json({ checkoutUrl: mollie._links.checkout.href, checkoutSessionId: session.id }, 201);
  } catch (error) {
    console.error("commerce-create-payment", { phase, cartId, sessionId, error });
    try {
      const supabase = adminClient();
      if (sessionId) await supabase.from("commerce_checkout_sessions").update({ status: "cancelled" }).eq("id", sessionId);
      else if (cartId) await supabase.from("commerce_carts").delete().eq("id", cartId);
    } catch (cleanupError) {
      console.error("commerce-create-payment-cleanup", { phase, cartId, sessionId, cleanupError });
    }
    return json({ error: `De betaling kon niet worden gestart (stap ${phase}).`, code: `CHECKOUT_${phase}` }, 500);
  }
});
