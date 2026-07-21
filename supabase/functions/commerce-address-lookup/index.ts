import { corsHeaders, json } from "../_shared/http.ts";
import { findDutchAddress } from "../_shared/pdok.ts";
import { cleanText, validPostalCode } from "../_shared/validation.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { country, postalCode, houseNumber } = await request.json();
    if (country !== "NL") return json({ error: "Automatisch adres zoeken is momenteel beschikbaar voor Nederlandse adressen." }, 400);
    if (!validPostalCode(postalCode, "NL") || !cleanText(houseNumber, 20)) return json({ error: "Vul een geldige postcode en een huisnummer in." }, 400);
    const address = await findDutchAddress(postalCode, houseNumber);
    return address ? json({ address, verified: true }) : json({ error: "Dit adres is niet gevonden. Controleer postcode, huisnummer en toevoeging." }, 404);
  } catch (error) {
    console.error("commerce-address-lookup", error);
    return json({ error: "De adrescontrole is tijdelijk niet beschikbaar. U kunt het adres handmatig invullen." }, 503);
  }
});
