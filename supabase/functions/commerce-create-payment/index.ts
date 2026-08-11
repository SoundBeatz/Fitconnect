import { corsHeaders, json, requiredEnv } from "../_shared/http.ts";
import { adminClient } from "../_shared/supabase.ts";
import { findDutchAddress } from "../_shared/pdok.ts";
import { cleanText, normalizeEmail, normalizePhone, normalizePostalCode, validEmail, validKvkNumber, validPostalCode, validVatNumber } from "../_shared/validation.ts";
import { clientIp, consumeRateLimit, sha256, signPaymentToken, verifyPaymentToken } from "../_shared/payment-security.ts";

type CartItem = { productId?: string; bundleId?: string; quantity?: number };
type CheckoutBody = {
  items?: CartItem[];
  customer?: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string; chamberOfCommerce?: string; vatNumber?: string; customerType?: string };
  shippingAddress?: { street?: string; houseNumber?: string; postalCode?: string; city?: string; region?: string; country?: string; bagId?: string; verified?: boolean };
  idempotencyKey?: string;
  checkoutNonce?: string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

async function statusToken(checkoutSessionId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await signPaymentToken({ purpose: "checkout:status", jti: crypto.randomUUID(), iat: now, exp: now + 1800, checkoutSessionId });
}

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

    const nonce = await verifyPaymentToken(body.checkoutNonce ?? "", "checkout:create");
    const emailHash = await sha256(email);
    const ip = clientIp(request);
    const ipHash = await sha256(ip);
    if (nonce.emailHash !== emailHash || !uuidPattern.test(nonce.jti)) return json({ error: "Ongeldige of verlopen checkoutbeveiliging." }, 403);

    const supabase = adminClient();
    const organizationId = requiredEnv("FITCONNECT_ORGANIZATION_ID");

    phase = "IDEMPOTENCY_SESSION_LOOKUP";
    const { data: existing, error: existingError } = await supabase
      .from("commerce_checkout_sessions")
      .select("id,email")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) {
      if (normalizeEmail(existing.email) !== email) return json({ error: "Checkoutreferentie hoort niet bij deze klant." }, 409);
      const { data: previousPayment, error: paymentLookupError } = await supabase
        .from("commerce_payments")
        .select("checkout_url,status")
        .eq("checkout_session_id", existing.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (paymentLookupError) throw paymentLookupError;
      if (previousPayment?.checkout_url && ["created", "pending"].includes(previousPayment.status)) {
        return json({ checkoutUrl: previousPayment.checkout_url, checkoutSessionId: existing.id, statusToken: await statusToken(existing.id) });
      }
    }

    const [{ data: consumed, error: nonceError }, ipLimit, emailLimit] = await Promise.all([
      supabase.rpc("commerce_consume_checkout_nonce", { p_jti: nonce.jti, p_email_hash: emailHash, p_ip_hash: ipHash }),
      consumeRateLimit(supabase, "create_payment_ip", ip, 10, 600),
      consumeRateLimit(supabase, "create_payment_email", email, 5, 600),
    ]);
    if (nonceError) throw nonceError;
    if (!consumed) return json({ error: "De checkoutbeveiliging is verlopen of al gebruikt." }, 403);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retry = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds, 1);
      return json({ error: "Te veel betaalpogingen. Probeer het later opnieuw." }, 429, { "retry-after": String(retry) });
    }

    let verifiedAddress = null;
    if (country === "NL") {
      verifiedAddress = await findDutchAddress(address.postalCode, address.houseNumber);
      if (!verifiedAddress) return json({ error: "Het Nederlandse leveradres kon niet in de BAG worden gevonden." }, 400);
      if (cleanText(address.street).toLowerCase() !== verifiedAddress.street.toLowerCase() || cleanText(address.city).toLowerCase() !== verifiedAddress.city.toLowerCase()) return json({ error: "Straat of plaats komt niet overeen met postcode en huisnummer. Zoek het adres opnieuw." }, 400);
    }
    if (!rawItems.length || rawItems.length > 100) return json({ error: "De winkelmand is leeg of te groot." }, 400);

    const quantities = new Map<string, number>();
    const bundleQuantities = new Map<string, number>();
    for (const item of rawItems) {
      const quantity = Number(item.quantity);
      const hasProduct = Boolean(item.productId);
      const hasBundle = Boolean(item.bundleId);
      if (hasProduct === hasBundle || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return json({ error: "De winkelmand bevat een ongeldig artikel." }, 400);
      if (hasProduct) {
        if (!uuidPattern.test(item.productId!)) return json({ error: "De winkelmand bevat een ongeldig product." }, 400);
        quantities.set(item.productId!, (quantities.get(item.productId!) ?? 0) + quantity);
      } else {
        if (!uuidPattern.test(item.bundleId!)) return json({ error: "De winkelmand bevat een ongeldige combinatiedeal." }, 400);
        bundleQuantities.set(item.bundleId!, (bundleQuantities.get(item.bundleId!) ?? 0) + quantity);
      }
    }

    const authorization = request.headers.get("Authorization") ?? "";
    const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const { data: authenticated } = accessToken ? await supabase.auth.getUser(accessToken) : { data: { user: null } };
    const userId = authenticated.user?.id ?? null;

    const ids = [...quantities.keys()];
    phase = "PRODUCTS";
    const { data: products, error: productError } = ids.length
      ? await supabase.from("products").select("id,name,price,vat,stock,status").in("id", ids).eq("status", "active")
      : { data: [], error: null };
    if (productError) throw productError;
    if (!products || products.length !== ids.length) return json({ error: "Een artikel is niet meer beschikbaar. Vernieuw de winkelmand." }, 409);

    const rawLines = products.map((product) => {
      const quantity = quantities.get(product.id)!;
      const grossUnit = money(Number(product.price));
      const vat = Number(product.vat ?? 21);
      const netUnit = money(grossUnit / (1 + vat / 100));
      return { product, quantity, grossUnit, netUnit, vat, bundle: null as null | { id: string; name: string } };
    });

    if (bundleQuantities.size) {
      phase = "BUNDLES";
      const now = new Date().toISOString();
      const { data: bundleRows, error: bundleError } = await supabase
        .from("commerce_bundles")
        .select("id,name,bundle_price,status,starts_at,ends_at,commerce_bundle_items(product_id,quantity,required,products(id,name,price,vat,stock,status))")
        .in("id", [...bundleQuantities.keys()])
        .eq("status", "active");
      if (bundleError) throw bundleError;
      if (!bundleRows || bundleRows.length !== bundleQuantities.size) return json({ error: "Een combinatiedeal is niet meer beschikbaar. Vernieuw de winkelmand." }, 409);
      for (const bundle of bundleRows) {
        if ((bundle.starts_at && bundle.starts_at > now) || (bundle.ends_at && bundle.ends_at <= now)) return json({ error: `${bundle.name} is op dit moment niet actief.` }, 409);
        const bundleQuantity = bundleQuantities.get(bundle.id)!;
        const components = (bundle.commerce_bundle_items ?? []).filter((item: any) => item.required !== false);
        if (components.length < 2) return json({ error: `${bundle.name} is niet volledig samengesteld.` }, 409);
        const regularTotal = components.reduce((sum: number, item: any) => sum + Number(item.products?.price ?? 0) * Number(item.quantity), 0);
        if (regularTotal <= Number(bundle.bundle_price)) return json({ error: `${bundle.name} heeft geen geldige pakketprijs.` }, 409);
        for (const item of components as any[]) {
          const product = item.products;
          const componentQuantity = Number(item.quantity) * bundleQuantity;
          if (!product || product.status !== "active" || Number(product.stock) < componentQuantity) return json({ error: `${product?.name ?? "Een onderdeel"} uit ${bundle.name} is niet voldoende beschikbaar.` }, 409);
          const componentRegular = Number(product.price) * Number(item.quantity);
          const allocatedGross = Number(bundle.bundle_price) * (componentRegular / regularTotal) * bundleQuantity;
          const grossUnit = allocatedGross / componentQuantity;
          const vat = Number(product.vat ?? 21);
          const netUnit = Math.round((grossUnit / (1 + vat / 100)) * 10000) / 10000;
          rawLines.push({ product, quantity: componentQuantity, grossUnit, netUnit, vat, bundle: { id: bundle.id, name: bundle.name } });
        }
      }
    }

    const grouped = new Map<string, { product: any; quantity: number; netTotal: number; grossTotal: number; vat: number; bundles: Array<{ id: string; name: string }> }>();
    for (const line of rawLines) {
      const current = grouped.get(line.product.id) ?? { product: line.product, quantity: 0, netTotal: 0, grossTotal: 0, vat: line.vat, bundles: [] };
      current.quantity += line.quantity;
      current.netTotal += line.netUnit * line.quantity;
      current.grossTotal += line.grossUnit * line.quantity;
      if (line.bundle && !current.bundles.some((bundle) => bundle.id === line.bundle!.id)) current.bundles.push(line.bundle);
      grouped.set(line.product.id, current);
    }
    const lines = [...grouped.values()].map((line) => ({ ...line, netUnit: Math.round((line.netTotal / line.quantity) * 10000) / 10000, grossUnit: line.grossTotal / line.quantity }));
    const subtotal = money(lines.reduce((sum, line) => sum + line.netUnit * line.quantity, 0));
    const grandTotal = money(lines.reduce((sum, line) => sum + line.grossUnit * line.quantity, 0));
    const taxTotal = money(grandTotal - subtotal);
    if (grandTotal < 0.01 || grandTotal > 100000) return json({ error: "Het orderbedrag kan niet worden verwerkt." }, 400);

    const company = cleanText(customer.company) || null;
    const kvkNumber = cleanText(customer.chamberOfCommerce, 20).replace(/\D/g, "") || null;
    const vatNumber = cleanText(customer.vatNumber, 24).replace(/[\s.-]/g, "").toUpperCase() || null;

    phase = "CART";
    const { data: cart, error: cartError } = await supabase.from("commerce_carts").insert({
      organization_id: organizationId,
      user_id: userId,
      status: "checkout",
      currency: "EUR",
      customer_email: email,
      metadata: { customer_type: isBusiness ? "business" : "consumer", company_name: company, kvk_number: kvkNumber, vat_number: vatNumber },
    }).select("id").single();
    if (cartError) throw cartError;
    cartId = cart.id;

    phase = "ITEMS";
    const { error: lineError } = await supabase.from("commerce_cart_items").insert(lines.map((line) => ({
      cart_id: cart.id,
      product_id: line.product.id,
      quantity: line.quantity,
      unit_price: line.netUnit,
      tax_rate: line.vat,
      product_name: line.product.name,
      metadata: { combination_deals: line.bundles },
    })));
    if (lineError) throw lineError;

    const storedAddress = {
      street: cleanText(address.street),
      house_number: cleanText(address.houseNumber, 20),
      postal_code: normalizePostalCode(address.postalCode, country),
      city: cleanText(address.city),
      region: cleanText(address.region),
      country,
      verified: country === "NL",
      bag_id: verifiedAddress?.bagId ?? null,
    };

    phase = "SESSION";
    const { data: checkoutSession, error: sessionError } = await supabase.from("commerce_checkout_sessions").insert({
      organization_id: organizationId,
      cart_id: cart.id,
      user_id: userId,
      status: "processing",
      email,
      first_name: cleanText(customer.firstName),
      last_name: cleanText(customer.lastName),
      phone,
      company_name: company,
      shipping_address: storedAddress,
      billing_address: storedAddress,
      subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      currency: "EUR",
      selected_payment_provider: "mollie",
      idempotency_key: idempotencyKey,
    }).select("id").single();
    if (sessionError) throw sessionError;
    sessionId = checkoutSession.id;

    const redirectBase = requiredEnv("CHECKOUT_RETURN_URL").replace(/\/$/, "");
    const webhookUrl = `${requiredEnv("SUPABASE_URL")}/functions/v1/commerce-mollie-webhook`;
    phase = "MOLLIE";
    const mollieResponse = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requiredEnv("MOLLIE_API_KEY")}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: { currency: "EUR", value: grandTotal.toFixed(2) },
        description: `FitConnect bestelling ${checkoutSession.id.slice(0, 8)}`,
        redirectUrl: `${redirectBase}?checkout=${checkoutSession.id}`,
        webhookUrl,
        metadata: { checkout_session_id: checkoutSession.id, organization_id: organizationId },
      }),
    });
    const mollie = await mollieResponse.json();
    if (!mollieResponse.ok || !mollie.id || !mollie._links?.checkout?.href) throw new Error(`Mollie payment creation failed: ${mollieResponse.status}`);

    phase = "PAYMENT";
    const { error: paymentError } = await supabase.from("commerce_payments").insert({
      organization_id: organizationId,
      checkout_session_id: checkoutSession.id,
      provider: "mollie",
      provider_payment_id: mollie.id,
      status: mollie.status === "open" ? "pending" : "created",
      amount: grandTotal,
      currency: "EUR",
      checkout_url: mollie._links.checkout.href,
      provider_payload: mollie,
    });
    if (paymentError) throw paymentError;

    return json({
      checkoutUrl: mollie._links.checkout.href,
      checkoutSessionId: checkoutSession.id,
      statusToken: await statusToken(checkoutSession.id),
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (/security token|checkoutbeveiliging|expired/i.test(message)) return json({ error: "Ongeldige of verlopen checkoutbeveiliging." }, 403);
    console.error("commerce-create-payment", { phase, cartId, sessionId, message });
    try {
      const supabase = adminClient();
      if (sessionId) await supabase.from("commerce_checkout_sessions").update({ status: "cancelled" }).eq("id", sessionId);
      else if (cartId) await supabase.from("commerce_carts").delete().eq("id", cartId);
    } catch (cleanupError) {
      console.error("commerce-create-payment-cleanup", cleanupError instanceof Error ? cleanupError.message : "unknown");
    }
    return json({ error: `De betaling kon niet worden gestart (stap ${phase}).`, code: `CHECKOUT_${phase}` }, 500);
  }
});
