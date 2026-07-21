import { cleanText, normalizePostalCode } from "./validation.ts";

export type VerifiedAddress = { street: string; houseNumber: string; postalCode: string; city: string; region: string; country: "NL"; bagId: string | null };

export async function findDutchAddress(postalCode: unknown, houseNumber: unknown): Promise<VerifiedAddress | null> {
  const postal = normalizePostalCode(postalCode, "NL");
  const house = cleanText(houseNumber, 20);
  const query = new URLSearchParams({ q: `${postal} ${house}`, fq: "type:adres", rows: "3", fl: "id,postcode,huis_nlt,straatnaam,woonplaatsnaam,provincienaam" });
  const response = await fetch(`https://api.pdok.nl/bzk/locatieserver/search/v3_1/free?${query}`, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(`PDOK address lookup failed: ${response.status}`);
  const payload = await response.json();
  const normalizedHouse = house.toUpperCase().replace(/[\s-]/g, "");
  const document = payload?.response?.docs?.find((item: Record<string, unknown>) => normalizePostalCode(item.postcode, "NL") === postal && cleanText(item.huis_nlt, 20).toUpperCase().replace(/[\s-]/g, "") === normalizedHouse);
  if (!document) return null;
  return {
    street: cleanText(document.straatnaam), houseNumber: cleanText(document.huis_nlt, 20), postalCode: postal,
    city: cleanText(document.woonplaatsnaam), region: cleanText(document.provincienaam), country: "NL", bagId: cleanText(document.id, 80) || null,
  };
}
