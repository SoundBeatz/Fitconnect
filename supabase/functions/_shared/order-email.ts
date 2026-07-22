import { requiredEnv } from "./http.ts";
import { bytesToBase64 } from "./invoice-pdf.ts";

type OrderItem = { product_name: string; quantity: number; unit_price: number; tax_rate: number };
type PaidOrder = {
  id: string; first_name: string; email: string; grand_total: number; currency: string;
  shipping_address?: Record<string, string> | null; items: OrderItem[];
  invoice?: { invoice_number: string; pdf: Uint8Array };
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const euro = (value: number, currency = "EUR") => new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(value);

export async function sendPaidOrderEmail(order: PaidOrder): Promise<string> {
  const reference = order.id.slice(0, 8).toUpperCase();
  const portalUrl = `${requiredEnv("CUSTOMER_PORTAL_URL").replace(/\/$/, "")}/orders/?order=${encodeURIComponent(order.id)}`;
  const rows = order.items.map((item) => {
    const gross = Number(item.unit_price) * (1 + Number(item.tax_rate) / 100) * Number(item.quantity);
    return `<tr><td style="padding:12px 0;border-bottom:1px solid #e8e8e8">${escapeHtml(item.product_name)} × ${Number(item.quantity)}</td><td style="padding:12px 0;border-bottom:1px solid #e8e8e8;text-align:right;font-weight:700">${escapeHtml(euro(gross, order.currency))}</td></tr>`;
  }).join("");
  const address = order.shipping_address ?? {};
  const invoiceNotice = order.invoice ? `<div style="margin:22px 0;padding:18px;background:#fff5ee;border:1px solid #ffd8bf;border-radius:14px"><strong>Factuur ${escapeHtml(order.invoice.invoice_number)}</strong><p style="margin:8px 0 0;line-height:1.6;color:#646b72">Uw betaalde factuur is als PDF bijgevoegd en blijft beschikbaar in uw klantportaal.</p></div>` : "";
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f2f4f5;font-family:Arial,sans-serif;color:#121416"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:auto;background:#fff;border-radius:22px;overflow:hidden"><tr><td style="padding:28px 34px;background:#11171d;color:#fff"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#f36f21">FITCONNECT</div><h1 style="margin:10px 0 0;font-size:32px">Dankjewel, ${escapeHtml(order.first_name)}!</h1></td></tr><tr><td style="padding:34px"><p style="margin:0 0 20px;font-size:17px;line-height:1.6">We hebben uw bestelling en betaling ontvangen. Controleer hieronder of uw bestelling in orde is.</p><p style="margin:0 0 24px;color:#646b72">Bestelnummer <strong style="color:#121416">${reference}</strong> · status <strong style="color:#237044">Wordt verwerkt</strong></p><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}<tr><td style="padding:16px 0;font-size:18px;font-weight:900">Totaal incl. btw</td><td style="padding:16px 0;text-align:right;font-size:18px;font-weight:900">${escapeHtml(euro(Number(order.grand_total), order.currency))}</td></tr></table>${invoiceNotice}<div style="margin:22px 0;padding:18px;background:#f5f6f7;border-radius:14px"><strong>Bezorgadres</strong><p style="margin:8px 0 0;line-height:1.6;color:#646b72">${escapeHtml(address.street)} ${escapeHtml(address.house_number)}<br>${escapeHtml(address.postal_code)} ${escapeHtml(address.city)}</p></div><p style="line-height:1.6;color:#646b72">Zodra uw bestelling is verzonden, ontvangt u een nieuwe e-mail met Track &amp; Trace. De actuele voortgang vindt u ook in uw klantportaal.</p><p style="margin:28px 0 10px"><a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:15px 22px;border-radius:999px;background:#f36f21;color:#fff;text-decoration:none;font-weight:900">Bekijk mijn bestelling</a></p></td></tr></table></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `fitconnect-paid-${order.id}` },
    body: JSON.stringify({
      from: requiredEnv("ORDER_EMAIL_FROM"), reply_to: Deno.env.get("ORDER_EMAIL_REPLY_TO")?.trim() || undefined,
      to: [order.email], subject: `Bestelling ${reference} ontvangen | FitConnect`, html,
      attachments: order.invoice ? [{ filename: `${order.invoice.invoice_number}.pdf`, content: bytesToBase64(order.invoice.pdf), content_type: "application/pdf" }] : undefined,
    }),
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(`Resend order confirmation failed: ${response.status}`);
  return result.id;
}

type ShippedOrder = { id: string; first_name: string; email: string; tracking_carrier: string; tracking_code: string; tracking_url?: string | null };
export async function sendShippedOrderEmail(order: ShippedOrder): Promise<string> {
  const reference = order.id.slice(0, 8).toUpperCase();
  const portalUrl = `${requiredEnv("CUSTOMER_PORTAL_URL").replace(/\/$/, "")}/orders/?order=${encodeURIComponent(order.id)}`;
  const trackingAction = order.tracking_url ? `<a href="${escapeHtml(order.tracking_url)}" style="display:inline-block;padding:15px 22px;border-radius:999px;background:#f36f21;color:#fff;text-decoration:none;font-weight:900">Volg uw bestelling</a>` : `<a href="${escapeHtml(portalUrl)}" style="display:inline-block;padding:15px 22px;border-radius:999px;background:#f36f21;color:#fff;text-decoration:none;font-weight:900">Bekijk mijn bestelling</a>`;
  const html = `<!doctype html><html lang="nl"><body style="margin:0;background:#f2f4f5;font-family:Arial,sans-serif;color:#121416"><table role="presentation" width="100%"><tr><td style="padding:32px 14px"><table role="presentation" width="100%" style="max-width:640px;margin:auto;background:#fff;border-radius:22px;overflow:hidden"><tr><td style="padding:28px 34px;background:#11171d;color:#fff"><div style="font-size:12px;font-weight:900;letter-spacing:.14em;color:#f36f21">FITCONNECT</div><h1 style="margin:10px 0 0;font-size:32px">Uw bestelling is verzonden</h1></td></tr><tr><td style="padding:34px"><p style="font-size:17px;line-height:1.6">Goed nieuws, ${escapeHtml(order.first_name)}. Bestelling <strong>${reference}</strong> is overgedragen aan ${escapeHtml(order.tracking_carrier)}.</p><div style="margin:24px 0;padding:20px;background:#f5f6f7;border-radius:14px"><strong>Track &amp; Trace</strong><p style="margin:8px 0 0;font-size:20px;font-weight:900">${escapeHtml(order.tracking_code)}</p></div><p>${trackingAction}</p><p style="margin-top:28px;line-height:1.6;color:#646b72">De actuele voortgang blijft ook zichtbaar in uw FitConnect-klantportaal.</p></td></tr></table></td></tr></table></body></html>`;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`, "Content-Type": "application/json", "Idempotency-Key": `fitconnect-shipped-${order.id}` }, body: JSON.stringify({ from: requiredEnv("ORDER_EMAIL_FROM"), reply_to: Deno.env.get("ORDER_EMAIL_REPLY_TO")?.trim() || undefined, to: [order.email], subject: `Bestelling ${reference} is verzonden | FitConnect`, html }) });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error(`Resend shipping confirmation failed: ${response.status}`);
  return result.id;
}
