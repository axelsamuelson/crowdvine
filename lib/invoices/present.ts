import type { InvoiceData, LineItem } from "@/types/invoice";
import {
  resolveCompanyExciseNumber,
  resolveCompanyOrgNumber,
  resolveCompanyVatNumber,
} from "@/lib/invoice-sender-constants";
import type { SavedInvoice } from "@/lib/invoices/drafts";

type SenderLike = {
  company_name?: string;
  company_logo?: string;
  company_details?: string;
  org_number?: string;
  vat_number?: string;
  excise_number?: string;
  from_name?: string;
  from_email?: string;
  from_address?: string;
  from_postal_code?: string;
  from_city?: string;
  from_country?: string;
  clearing_number?: string;
  account_number?: string;
  payment_terms?: string;
  default_footer?: string;
};

function text(record: Record<string, unknown> | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function nullableText(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function primaryFromSnapshot(record: Record<string, unknown> | null): {
  name: string;
  email: string | null;
} | null {
  const contact = record?.primary_contact;
  if (!isRecord(contact)) return null;
  const name = typeof contact.name === "string" ? contact.name.trim() : "";
  if (!name) return null;
  return {
    name,
    email: typeof contact.email === "string" ? contact.email : null,
  };
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function savedInvoiceToInvoiceData(
  invoice: SavedInvoice,
  senderDefaults: SenderLike | null,
): InvoiceData {
  const issued = invoice.status !== "draft" && invoice.recipient_snapshot;
  const sender = issued && invoice.sender_snapshot ? invoice.sender_snapshot : null;
  const senderSource = sender ?? senderDefaults;
  const bill = issued && invoice.recipient_snapshot ? invoice.recipient_snapshot : null;
  const live = invoice.recipient;
  const contact = bill
    ? primaryFromSnapshot(bill)
    : live?.primary_contact?.name
      ? { name: live.primary_contact.name, email: live.primary_contact.email }
      : null;

  const rates = [...new Set(invoice.lines.map((line) => line.vat_rate))];
  const taxRate = rates.length === 1 ? rates[0] : invoice.lines[0]?.vat_rate ?? 25;
  const today = new Date().toISOString().slice(0, 10);
  const invoiceDate = invoice.invoice_date ?? today;
  const dueDate =
    invoice.due_date ?? addDays(invoiceDate, invoice.payment_terms_days);

  const items: LineItem[] = invoice.lines.map((line) => ({
    id: line.id,
    description: line.vintage ? `${line.description} ${line.vintage}` : line.description,
    quantity: line.quantity,
    price: line.unit_price_ore / 100,
    currency: invoice.currency || "SEK",
    exchangeRate: 1,
    discountType: "percentage",
    discountValue: 0,
    lineTotalOre: line.line_total_ore,
  }));

  const ship = invoice.ship_to;

  return {
    invoiceNumber: invoice.invoice_number ?? "",
    date: invoiceDate,
    dueDate,
    companyName: textOf(senderSource, "company_name"),
    companyLogo: textOf(senderSource, "company_logo"),
    companyDetails: textOf(senderSource, "company_details"),
    companyOrgNumber: resolveCompanyOrgNumber(textOf(senderSource, "org_number")),
    companyVatNumber: resolveCompanyVatNumber(textOf(senderSource, "vat_number")),
    companyExciseNumber: resolveCompanyExciseNumber(textOf(senderSource, "excise_number")),
    fromName: textOf(senderSource, "from_name"),
    fromEmail: textOf(senderSource, "from_email"),
    fromAddress: textOf(senderSource, "from_address"),
    fromPostalCode: textOf(senderSource, "from_postal_code"),
    fromCity: textOf(senderSource, "from_city"),
    fromCountry: textOf(senderSource, "from_country"),
    toName: bill ? text(bill, "company_name") : live?.company_name ?? "",
    toEmail: bill ? text(bill, "email") : live?.email ?? "",
    toAddress: bill ? text(bill, "address") : live?.address ?? "",
    toPostalCode: bill ? text(bill, "postal_code") : live?.postal_code ?? "",
    toCity: bill ? text(bill, "city") : live?.city ?? "",
    toCountry: "",
    toContactName: contact?.name ?? "",
    shipToSameAsBillTo: false,
    shipToName: ship ? text(ship, "name") : "",
    shipToAddress: ship ? text(ship, "address") : "",
    shipToPostalCode: ship ? text(ship, "postal_code") : "",
    shipToCity: ship ? text(ship, "city") : "",
    shipToCountry: ship ? text(ship, "country") : "",
    shipToContact: nullableText(ship, "contact") ?? "",
    clearingNumber: textOf(senderSource, "clearing_number"),
    accountNumber: textOf(senderSource, "account_number"),
    reference: "",
    paymentTerms:
      textOf(senderSource, "payment_terms") ||
      `${invoice.payment_terms_days} dagar`,
    shippingHandlingAmount: 0,
    items,
    notes: invoice.notes ?? "",
    taxRate,
    currency: invoice.currency || "SEK",
    footer: textOf(senderSource, "default_footer") || "Thank you for your business!",
    discountType: "percentage",
    discountValue: 0,
    applyInvoiceDiscountToDiscountedItems: true,
    amountsOre: {
      subtotal: invoice.subtotal_ore,
      vat: invoice.vat_ore,
      total: invoice.total_ore,
    },
  };
}

function textOf(source: unknown, key: string): string {
  if (!isRecord(source)) return "";
  const value = source[key];
  return typeof value === "string" ? value : "";
}
