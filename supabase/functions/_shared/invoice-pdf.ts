import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

type Invoice = {
  invoice_number: string; issued_at: string; paid_at?: string | null; currency: string;
  subtotal: number; tax_total: number; grand_total: number;
  supplier_snapshot: Record<string, string>; customer_snapshot: Record<string, string>;
  line_snapshot: Array<{ description: string; quantity: number; unit_price: number; tax_rate: number; net_total: number; tax_total: number; gross_total: number }>;
};

const orange = rgb(0.953, 0.435, 0.129), ink = rgb(0.067, 0.09, 0.114), muted = rgb(0.39, 0.43, 0.46), line = rgb(0.88, 0.9, 0.92);
const amount = (value: number) => `EUR ${Number(value).toFixed(2).replace(".", ",")}`;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("nl-NL", { timeZone: "Europe/Amsterdam", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "-";
const safe = (value: unknown) => String(value ?? "").replace(/[^\x20-\x7EÀ-ÿ]/g, " ");

export async function createInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Factuur ${invoice.invoice_number}`);
  pdf.setAuthor("Fitconnect");
  pdf.setSubject("Betaalde FitConnect-factuur");
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]), y = 780;
  const text = (value: unknown, x: number, size = 9, font = regular, color = ink) => page.drawText(safe(value), { x, y, size, font, color });
  const nextPage = () => { page = pdf.addPage([595.28, 841.89]); y = 790; };

  page.drawRectangle({ x: 42, y: 748, width: 48, height: 48, color: orange });
  page.drawText("FC", { x: 56, y: 765, size: 16, font: bold, color: rgb(1,1,1) });
  page.drawText("FITCONNECT", { x: 104, y: 771, size: 20, font: bold, color: ink });
  page.drawText("FACTUUR", { x: 445, y: 771, size: 16, font: bold, color: orange });
  y = 716;

  text(invoice.supplier_snapshot.name, 42, 10, bold); y -= 16;
  text(invoice.supplier_snapshot.address, 42); y -= 13;
  text(`${invoice.supplier_snapshot.postal_code} ${invoice.supplier_snapshot.city}`, 42); y -= 13;
  text(invoice.supplier_snapshot.email, 42); y -= 13;
  text(invoice.supplier_snapshot.phone, 42);
  const metaX = 365; y = 716;
  text("Factuurnummer", metaX, 8, bold, muted); text(invoice.invoice_number, 455, 9, bold); y -= 18;
  text("Factuurdatum", metaX, 8, bold, muted); text(date(invoice.issued_at), 455); y -= 18;
  text("Betaaldatum", metaX, 8, bold, muted); text(date(invoice.paid_at), 455); y -= 18;
  text("Betaalstatus", metaX, 8, bold, muted); text("VOLDAAN", 455, 9, bold, rgb(0.12,0.43,0.24));

  y = 620; page.drawLine({ start: {x:42,y}, end:{x:553,y}, thickness:1, color:line }); y -= 30;
  text("FACTUUR AAN", 42, 8, bold, orange); y -= 18;
  const customer = invoice.customer_snapshot;
  text(customer.company || `${customer.first_name} ${customer.last_name}`, 42, 10, bold); y -= 15;
  if (customer.company) { text(`${customer.first_name} ${customer.last_name}`, 42); y -= 13; }
  text(`${customer.street} ${customer.house_number}`, 42); y -= 13;
  text(`${customer.postal_code} ${customer.city}`, 42); y -= 13;
  text(customer.email, 42); y -= 13;
  if (customer.kvk_number) { text(`KvK: ${customer.kvk_number}`, 42); y -= 13; }
  if (customer.vat_number) { text(`Btw-id: ${customer.vat_number}`, 42); y -= 13; }

  y -= 20;
  const tableHeader = () => {
    page.drawRectangle({ x:42, y:y-5, width:511, height:25, color:ink });
    page.drawText("Omschrijving", {x:50,y:y+3,size:8,font:bold,color:rgb(1,1,1)});
    page.drawText("Aantal", {x:330,y:y+3,size:8,font:bold,color:rgb(1,1,1)});
    page.drawText("Btw", {x:395,y:y+3,size:8,font:bold,color:rgb(1,1,1)});
    page.drawText("Totaal", {x:485,y:y+3,size:8,font:bold,color:rgb(1,1,1)}); y -= 24;
  };
  tableHeader();
  for (const item of invoice.line_snapshot) {
    if (y < 150) { nextPage(); tableHeader(); }
    text(item.description.slice(0,48), 50, 8); text(item.quantity, 340, 8); text(`${item.tax_rate}%`, 397, 8); text(amount(item.gross_total), 475, 8, bold);
    y -= 22; page.drawLine({start:{x:42,y:y+8},end:{x:553,y:y+8},thickness:.5,color:line});
  }
  if (y < 180) nextPage();
  y -= 12; text("Subtotaal excl. btw", 365, 9, bold); text(amount(invoice.subtotal), 475, 9, bold); y -= 19;
  text("Btw", 365, 9, bold); text(amount(invoice.tax_total), 475, 9, bold); y -= 24;
  page.drawRectangle({x:350,y:y-7,width:203,height:30,color:orange});
  page.drawText("Totaal voldaan",{x:365,y:y+3,size:10,font:bold,color:rgb(1,1,1)});
  page.drawText(amount(invoice.grand_total),{x:465,y:y+3,size:10,font:bold,color:rgb(1,1,1)});

  y -= 62; text(`KvK ${invoice.supplier_snapshot.kvk_number}  |  Btw-id ${invoice.supplier_snapshot.vat_number}  |  IBAN ${invoice.supplier_snapshot.iban}`, 42, 8, regular, muted);
  y -= 15; text("Deze factuur is volledig voldaan via Mollie. Bewaar dit document voor uw administratie.", 42, 8, regular, muted);
  return pdf.save();
}

export const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset=0; offset<bytes.length; offset+=0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset+0x8000));
  return btoa(binary);
};
