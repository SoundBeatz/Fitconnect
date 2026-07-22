import { createInvoicePdf } from "./invoice-pdf.ts";

type SupabaseAdmin = ReturnType<(typeof import("./supabase.ts"))["adminClient"]>;
type InvoiceContext = {
  supabase: SupabaseAdmin;
  payment: { id: string; organization_id: string; checkout_session_id: string; paid_at?: string | null; currency: string };
  order: { id: string; cart_id: string; first_name: string; last_name: string; email: string; phone?: string | null; company_name?: string | null; billing_address?: Record<string,string> | null; subtotal: number; tax_total: number; grand_total: number };
  cartMetadata?: Record<string,unknown> | null;
  items: Array<{ product_name: string; quantity: number; unit_price: number; tax_rate: number }>;
};

export const supplierSnapshot = Object.freeze({
  name: "Fitconnect",
  address: "Traverse 128",
  postal_code: "5361 TH",
  city: "Grave",
  country: "Nederland",
  email: "info@fitconnect.nl",
  phone: "085 0606216",
  kvk_number: "55790402",
  establishment_number: "000025407325",
  vat_number: "NL001872136B40",
  iban: "NL78SNSB0896039455",
});

const money = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export async function ensureInvoice(context: InvoiceContext) {
  const { supabase, payment, order, items } = context;
  const address = order.billing_address ?? {};
  const metadata = context.cartMetadata ?? {};
  const lines = items.map((item) => {
    const netTotal = money(Number(item.unit_price) * Number(item.quantity));
    const taxTotal = money(netTotal * Number(item.tax_rate) / 100);
    return { description: item.product_name, quantity: Number(item.quantity), unit_price: Number(item.unit_price), tax_rate: Number(item.tax_rate), net_total: netTotal, tax_total: taxTotal, gross_total: money(netTotal + taxTotal) };
  });
  const customer = {
    first_name: order.first_name,
    last_name: order.last_name,
    email: order.email,
    phone: order.phone ?? "",
    company: order.company_name ?? "",
    kvk_number: String(metadata.kvk_number ?? ""),
    vat_number: String(metadata.vat_number ?? ""),
    street: address.street ?? "",
    house_number: address.house_number ?? "",
    postal_code: address.postal_code ?? "",
    city: address.city ?? "",
    country: address.country ?? "NL",
  };
  const { data, error } = await supabase.rpc("commerce_create_invoice_snapshot", {
    p_organization_id: payment.organization_id,
    p_checkout_session_id: order.id,
    p_payment_id: payment.id,
    p_paid_at: payment.paid_at ?? new Date().toISOString(),
    p_currency: payment.currency,
    p_subtotal: order.subtotal,
    p_tax_total: order.tax_total,
    p_grand_total: order.grand_total,
    p_supplier_snapshot: supplierSnapshot,
    p_customer_snapshot: customer,
    p_line_snapshot: lines,
  });
  if (error || !data) throw error ?? new Error("Invoice snapshot was not created");
  const invoice = Array.isArray(data) ? data[0] : data;
  let pdf: Uint8Array;
  if (invoice.pdf_path) {
    const { data: stored, error: downloadError } = await supabase.storage.from("commerce-invoices").download(invoice.pdf_path);
    if (downloadError || !stored) throw downloadError ?? new Error("Stored invoice PDF is unavailable");
    pdf = new Uint8Array(await stored.arrayBuffer());
  } else {
    pdf = await createInvoicePdf(invoice);
    const path = `${payment.organization_id}/${invoice.invoice_number}.pdf`;
    const { error: uploadError } = await supabase.storage.from("commerce-invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw uploadError;
    const { error: updateError } = await supabase.from("commerce_invoices").update({ pdf_path: path, updated_at: new Date().toISOString() }).eq("id", invoice.id).is("pdf_path", null);
    if (updateError) throw updateError;
    invoice.pdf_path = path;
  }
  return { invoice, pdf };
}
