const emailPattern = /^[^\s@]{1,64}@[^\s@.](?:[^\s@]{0,251}[^\s@.])?\.[a-z]{2,63}$/i;
const postalPatterns: Record<string, RegExp> = {
  NL: /^[1-9][0-9]{3}[A-Z]{2}$/,
  BE: /^[1-9][0-9]{3}$/,
  DE: /^[0-9]{5}$/,
  LU: /^[0-9]{4}$/,
  FR: /^[0-9]{5}$/,
};
const callingCodes: Record<string, string> = { NL: "31", BE: "32", DE: "49", LU: "352", FR: "33" };

export const cleanText = (value: unknown, max = 160) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);
export const normalizePostalCode = (value: unknown, country: string) => {
  const normalized = cleanText(value, 12).toUpperCase().replace(/[\s-]/g, "");
  return country === "LU" ? normalized.replace(/^L/, "") : normalized;
};
export const validPostalCode = (value: unknown, country: string) => (postalPatterns[country] ?? /^.{3,10}$/).test(normalizePostalCode(value, country));
export const normalizeEmail = (value: unknown) => cleanText(value, 254).toLowerCase();
export const validEmail = (value: unknown) => emailPattern.test(normalizeEmail(value));

export function normalizePhone(value: unknown, country: string): string | null {
  let phone = cleanText(value, 30).replace(/[^0-9+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith("+")) {
    const callingCode = callingCodes[country];
    if (!callingCode) return null;
    phone = `+${callingCode}${phone.replace(/^0+/, "")}`;
  }
  const digits = phone.slice(1);
  return /^[1-9][0-9]{7,14}$/.test(digits) ? `+${digits}` : null;
}

export const validKvkNumber = (value: unknown) => /^[0-9]{8}$/.test(cleanText(value).replace(/\D/g, ""));
export const validVatNumber = (value: unknown) => !cleanText(value) || /^[A-Z]{2}[A-Z0-9.+*]{2,14}$/i.test(cleanText(value).replace(/[\s.-]/g, ""));
