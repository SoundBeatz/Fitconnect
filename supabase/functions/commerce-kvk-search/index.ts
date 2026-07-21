import { corsHeaders, json } from "../_shared/http.ts";
import { cleanText } from "../_shared/validation.ts";

const TEST_KEY = "l7xx1f2691f2520d487b902f4e0b57a0b197";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const { query } = await request.json();
    const term = cleanText(query, 100);
    if (term.length < 3) return json({ error: "Vul minimaal drie tekens of een volledig KVK-nummer in." }, 400);
    const production = Deno.env.get("KVK_ENVIRONMENT") === "production";
    const apiKey = production ? Deno.env.get("KVK_API_KEY")?.trim() : TEST_KEY;
    if (!apiKey) throw new Error("KVK production key is missing");
    const params = new URLSearchParams({ resultatenPerPagina: "8", pagina: "1" });
    params.set(/^\d{8}$/.test(term.replace(/\D/g, "")) ? "kvkNummer" : "naam", /^\d{8}$/.test(term.replace(/\D/g, "")) ? term.replace(/\D/g, "") : term);
    const base = production ? "https://api.kvk.nl/api/v2/zoeken" : "https://api.kvk.nl/test/api/v2/zoeken";
    const response = await fetch(`${base}?${params}`, { headers: { apikey: apiKey, accept: "application/json" }, signal: AbortSignal.timeout(7000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`KVK search failed: ${response.status}`);
    const results = (payload.resultaten ?? []).slice(0, 8).map((result: Record<string, any>) => {
      const address = result.adres?.binnenlandsAdres ?? {};
      return { kvkNumber: cleanText(result.kvkNummer, 8), branchNumber: cleanText(result.vestigingsnummer, 12) || null, name: cleanText(result.naam), type: cleanText(result.type, 40), street: cleanText(address.straatnaam), city: cleanText(address.plaats) };
    });
    return json({ results, environment: production ? "production" : "test" });
  } catch (error) {
    console.error("commerce-kvk-search", error);
    return json({ error: "KVK zoeken is tijdelijk niet beschikbaar." }, 503);
  }
});
