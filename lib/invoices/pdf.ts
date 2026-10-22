import { jsPDF } from "jspdf";
import { formatCurrency } from "@/lib/invoice-utils";
import type { SavedInvoice } from "@/lib/invoices/drafts";
import { savedInvoiceToInvoiceData } from "@/lib/invoices/present";
import type { InvoiceSenderDefaults } from "@/lib/invoices/sender";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;

export function invoicePdfFilename(invoice: Pick<SavedInvoice, "id" | "invoice_number">): string {
  const number = invoice.invoice_number?.trim();
  if (number) return `faktura-${number}.pdf`;
  return `faktura-utkast-${invoice.id.slice(0, 8)}.pdf`;
}

export type InvoiceEmailAttachment = {
  id: string;
  invoice_number: string | null;
  status: SavedInvoice["status"];
  filename: string;
  mime_type: "application/pdf";
  to_email: string;
  to_name: string;
  to_contact_name: string;
  currency: string;
  subtotal_ore: number;
  vat_ore: number;
  total_ore: number;
  invoice_date: string;
  due_date: string;
  pdf_base64: string;
  instruction: string;
};

function mailInstruction(status: SavedInvoice["status"]): string {
  if (status === "issued" || status === "paid") {
    return "Bifoga pdf_base64 som PDF i mejlutkastet till to_email. Skicka inte mejlet.";
  }
  if (status === "void") {
    return "Fakturan är makulerad och ska inte bifogas ett kundmejl.";
  }
  return "Utkast utan fakturanummer. Anropa issue_invoice innan PDF:en läggs i ett kundmejl.";
}

export function invoiceEmailAttachment(
  invoice: SavedInvoice,
  pdf: Uint8Array,
  sender: InvoiceSenderDefaults | null,
): InvoiceEmailAttachment {
  const data = savedInvoiceToInvoiceData(invoice, sender);
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    filename: invoicePdfFilename(invoice),
    mime_type: "application/pdf",
    to_email: data.toEmail,
    to_name: data.toName,
    to_contact_name: data.toContactName ?? "",
    currency: invoice.currency || "SEK",
    subtotal_ore: invoice.subtotal_ore,
    vat_ore: invoice.vat_ore,
    total_ore: invoice.total_ore,
    invoice_date: data.date,
    due_date: data.dueDate,
    pdf_base64: Buffer.from(pdf).toString("base64"),
    instruction: mailInstruction(invoice.status),
  };
}

function money(amount: number, currency: string): string {
  return formatCurrency(amount, currency).replace(/[\u00a0\u202f]/g, " ");
}

function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatQty(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 3 }).format(quantity);
}

function orgNumberOf(invoice: SavedInvoice): string {
  const snap = invoice.recipient_snapshot;
  if (snap && typeof snap.org_number === "string") return snap.org_number.trim();
  return invoice.recipient?.org_number?.trim() ?? "";
}

function statusBanner(status: SavedInvoice["status"]): string | null {
  if (status === "draft") return "UTKAST";
  if (status === "void") return "MAKULERAD";
  if (status === "paid") return "BETALD";
  return null;
}

/** A4 invoice PDF from stored öre amounts, for attaching to an email draft. */
export function renderInvoicePdf(
  invoice: SavedInvoice,
  sender: InvoiceSenderDefaults | null,
): Uint8Array {
  const data = savedInvoiceToInvoiceData(invoice, sender);
  const currency = data.currency || "SEK";
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  const newPage = () => {
    pdf.addPage();
    y = MARGIN;
  };

  const ensure = (height: number) => {
    if (y + height > PAGE_H - MARGIN) newPage();
  };

  const write = (
    value: string,
    x: number,
    size: number,
    style: "normal" | "bold",
    options?: { align?: "left" | "right"; color?: [number, number, number]; maxWidth?: number },
  ) => {
    const lines = pdf.splitTextToSize(value, options?.maxWidth ?? CONTENT_W) as string[];
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    const color = options?.color ?? [0, 0, 0];
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(lines, x, y, { align: options?.align ?? "left" });
    return lines.length * (size * 0.45);
  };

  const banner = statusBanner(invoice.status);
  if (banner) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(140, 40, 40);
    pdf.text(banner, PAGE_W - MARGIN, y, { align: "right" });
    y += 6;
  }

  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text("Faktura", MARGIN, y);
  y += 7;

  const numberLabel = data.invoiceNumber.trim()
    ? `Fakturanummer: ${data.invoiceNumber}`
    : "Fakturanummer: saknas (utkast)";
  y += write(numberLabel, MARGIN, 10, "normal", { color: [60, 60, 60] });
  y += 4;

  const dateRows: Array<[string, string]> = [
    ["Datum", formatIsoDate(data.date)],
    ["Förfallodatum", formatIsoDate(data.dueDate)],
  ];
  if (invoice.delivery_date) dateRows.push(["Leveransdatum", formatIsoDate(invoice.delivery_date)]);
  for (const [label, value] of dateRows) {
    if (!value) continue;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${label}: ${value}`, PAGE_W - MARGIN, y, { align: "right" });
    y += 5;
  }
  y += 3;

  pdf.setDrawColor(210);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  const columnW = CONTENT_W / 2 - 4;
  const leftX = MARGIN;
  const rightX = MARGIN + CONTENT_W / 2 + 4;

  const block = (x: number, startY: number, title: string, lines: string[]): number => {
    let cursor = startY;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(title, x, cursor);
    cursor += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(line, columnW) as string[];
      pdf.text(wrapped, x, cursor);
      cursor += wrapped.length * 4.6;
    }
    return cursor;
  };

  const fromLines = [
    data.companyName,
    data.companyOrgNumber ? `Org.nr: ${data.companyOrgNumber}` : "",
    data.companyVatNumber ? `Momsreg.nr: ${data.companyVatNumber}` : "",
    data.fromName,
    data.fromEmail,
    data.fromAddress,
    [data.fromPostalCode, data.fromCity].filter(Boolean).join(" "),
    data.fromCountry,
  ].filter((line) => line.trim());

  const org = orgNumberOf(invoice);
  const toLines = [
    data.toName,
    org ? `Org.nr: ${org}` : "",
    data.toAddress,
    [data.toPostalCode, data.toCity].filter(Boolean).join(" "),
    data.toCountry,
    data.toEmail,
    data.toContactName?.trim() ? `Kontakt: ${data.toContactName}` : "",
  ].filter((line) => line.trim());

  const leftBottom = block(leftX, y, "FRÅN", fromLines);
  const rightBottom = block(rightX, y, "FAKTURERA TILL", toLines);
  y = Math.max(leftBottom, rightBottom) + 4;

  const shipLines = data.shipToName?.trim()
    ? [
        data.shipToName,
        data.shipToAddress,
        [data.shipToPostalCode, data.shipToCity].filter(Boolean).join(" "),
        data.shipToCountry,
        data.shipToContact?.trim() ? `Kontakt: ${data.shipToContact}` : "",
      ].filter((line) => line.trim())
    : [];
  if (shipLines.length > 0) {
    ensure(8 + shipLines.length * 5);
    y = block(leftX, y, "LEVERANSADRESS", shipLines) + 4;
  }

  const payment = [
    data.clearingNumber?.trim() ? `Clearingnummer: ${data.clearingNumber}` : "",
    data.accountNumber?.trim() ? `Kontonummer: ${data.accountNumber}` : "",
    data.paymentTerms?.trim() ? `Betalningsvillkor: ${data.paymentTerms}` : "",
  ].filter(Boolean);
  if (payment.length > 0) {
    ensure(8 + payment.length * 5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text("BETALNINGSINFORMATION", MARGIN, y);
    y += 5;
    for (const line of payment) {
      y += write(line, MARGIN, 10, "normal");
    }
    y += 3;
  }

  const columns = [
    { label: "Beskrivning", width: 78, align: "left" as const },
    { label: "Antal", width: 18, align: "right" as const },
    { label: "Pris", width: 28, align: "right" as const },
    { label: "Moms", width: 18, align: "right" as const },
    { label: "Belopp", width: 36, align: "right" as const },
  ];

  const drawHeader = () => {
    ensure(10);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(40, 40, 40);
    let x = MARGIN;
    for (const column of columns) {
      const cellX = column.align === "right" ? x + column.width : x;
      pdf.text(column.label, cellX, y, { align: column.align });
      x += column.width;
    }
    y += 2;
    pdf.setDrawColor(40);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
  };

  drawHeader();

  invoice.lines.forEach((line, index) => {
    const description = data.items[index]?.description ?? line.description;
    const wrapped = pdf.splitTextToSize(description, columns[0].width - 2) as string[];
    const rowH = Math.max(wrapped.length * 4.6, 6);
    if (y + rowH > PAGE_H - MARGIN) {
      newPage();
      drawHeader();
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(20, 20, 20);
    pdf.text(wrapped, MARGIN, y);
    const cells = [
      formatQty(line.quantity),
      money(line.unit_price_ore / 100, currency),
      `${line.vat_rate}%`,
      money(line.line_total_ore / 100, currency),
    ];
    let x = MARGIN + columns[0].width;
    cells.forEach((cell, cellIndex) => {
      const column = columns[cellIndex + 1];
      pdf.text(cell, x + column.width, y, { align: "right" });
      x += column.width;
    });
    y += rowH + 1.5;
  });

  y += 2;
  pdf.setDrawColor(180);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  const rates = [...new Set(invoice.lines.map((line) => line.vat_rate))];
  const totals: Array<[string, string, boolean]> = [
    ["Total exkl. moms", money(invoice.subtotal_ore / 100, currency), false],
    [
      rates.length === 1 ? `Moms ${rates[0]}%` : "Moms",
      money(invoice.vat_ore / 100, currency),
      false,
    ],
    ["Total inkl. moms", money(invoice.total_ore / 100, currency), true],
  ];
  for (const [label, value, strong] of totals) {
    ensure(7);
    pdf.setFont("helvetica", strong ? "bold" : "normal");
    pdf.setFontSize(strong ? 12 : 10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(label, PAGE_W - MARGIN - 55, y);
    pdf.text(value, PAGE_W - MARGIN, y, { align: "right" });
    y += strong ? 7 : 6;
  }

  if (data.notes.trim()) {
    y += 4;
    ensure(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text("ANTECKNINGAR", MARGIN, y);
    y += 5;
    const noteLines = pdf.splitTextToSize(data.notes, CONTENT_W) as string[];
    ensure(noteLines.length * 4.6);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(30, 30, 30);
    pdf.text(noteLines, MARGIN, y);
    y += noteLines.length * 4.6;
  }

  if (data.footer.trim()) {
    y += 8;
    ensure(10);
    pdf.setDrawColor(220);
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 5;
    const footerLines = pdf.splitTextToSize(data.footer, CONTENT_W) as string[];
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 120, 120);
    pdf.text(footerLines, PAGE_W / 2, y, { align: "center" });
  }

  return new Uint8Array(pdf.output("arraybuffer"));
}
