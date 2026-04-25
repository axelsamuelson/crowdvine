import type { InvoiceData } from "@/types/invoice";
import type { DirtyWineOrderRow } from "@/lib/types/dirty-wine-order";

export function validateInvoiceForOrder(invoice: InvoiceData): string | null {
  if (!invoice.invoiceNumber?.trim()) return "Fakturanummer saknas.";
  if (!invoice.items?.length) return "Lägg till minst en rad.";
  for (const item of invoice.items) {
    if (!item.quantity || item.quantity < 1) return "Ogiltig kvantitet på en rad.";
    if (item.price < 0) return "Ogiltigt pris på en rad.";
  }
  if (!invoice.toName?.trim() && !invoice.toEmail?.trim()) {
    return "Ange kundnamn eller e-post under Kund (fakturera till).";
  }
  return null;
}

/** Parse JSONB invoice_data from DB; returns undefined if not a usable InvoiceData. */
export function parseInvoiceDataFromRow(raw: unknown): InvoiceData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.invoiceNumber !== "string" || !Array.isArray(o.items)) return undefined;
  return raw as InvoiceData;
}

export type DirtyWineOrderDbRow = {
  id: string;
  order_type: string;
  order_id: string;
  order_date: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  status: string;
  created_at: string;
  invoice_data?: unknown;
};

export function mapDbRowToDirtyWineOrder(r: DirtyWineOrderDbRow): DirtyWineOrderRow {
  const base: DirtyWineOrderRow = {
    id: r.id,
    type: r.order_type === "online" ? "online" : "offline",
    orderId: r.order_id,
    date: r.order_date?.slice(0, 10) ?? "",
    customer: r.customer_name ?? "",
    email: r.customer_email ?? "",
    totalCents: r.total_cents ?? 0,
    status: r.status ?? "",
    createdAt: r.created_at,
  };
  const invoiceData = parseInvoiceDataFromRow(r.invoice_data);
  return invoiceData ? { ...base, invoiceData } : base;
}
