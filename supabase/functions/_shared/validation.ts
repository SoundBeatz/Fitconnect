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
const blockedEmailDomains = new Set(["mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "example.com", "example.org", "example.net"]);
export const validEmail = (value: unknown) => {
  const email = normalizeEmail(value);
  if (!emailPattern.test(email)) return false;
  const domain = email.split("@")[1];
  return Boolean(domain && !blockedEmailDomains.has(domain) && !domain.includes("..") && !domain.startsWith("-") && !domain.endsWith("-"));
};

export function normalizePhone(value: unknown, country: string): string | null {
  let phone = cleanText(value, 30).replace(/[^0-9+]/g, "");
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (!phone.startsWith("+")) {
    const callingCode = callingCodes[country];
    if (!callingCode) return null;
    phone = `+${callingCode}${phone.replace(/^0+/, "")}`;
  }
  const digits = phone.slice(1);
  if (!/^[1-9][0-9]{7,14}$/.test(digits)) return null;
  if (country === "NL" && !/^31(?:6[1-9][0-9]{7}|(?:10|13|15|20|23|24|26|30|33|35|36|38|40|43|45|46|50|53|55|58|70|71|72|73|74|75|76|77|78|79)[1-9][0-9]{6}|(?:85|88)[1-9][0-9]{6})$/.test(digits)) return null;
  return `+${digits}`;
}

export const validKvkNumber = (value: unknown) => /^[0-9]{8}$/.test(cleanText(value).replace(/\D/g, ""));
export const validVatNumber = (value: unknown) => !cleanText(value) || /^[A-Z]{2}[A-Z0-9.+*]{2,14}$/i.test(cleanText(value).replace(/[\s.-]/g, ""));
