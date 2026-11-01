import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getInvoice } from "@/lib/invoices/drafts";
import { savedInvoiceToInvoiceData } from "@/lib/invoices/present";
import { loadInvoiceSenderDefaults } from "@/lib/invoices/sender";
import { zodMessage } from "@/lib/invoices/schemas";

const createB2bOrderSchema = z.object({
  invoice_id: z.string().uuid("Ogiltigt faktura-id"),
});

export type B2bOrderSummary = {
  id: string;
  order_id: string;
  order_date: string;
  customer_name: string;
  customer_email: string;
  total_cents: number;
  status: string;
  created_at: string;
  already_exists?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function summaryOf(value: unknown, alreadyExists = false): B2bOrderSummary {
  const row = asRecord(value);
  if (!row) throw new Error("Ogiltig order");
  const id = readString(row, "id");
  const orderId = readString(row, "order_id");
  if (!id || !orderId) throw new Error("Ogiltig order");
  const total = row.total_cents;
  const totalCents = typeof total === "number" ? total : typeof total === "string" ? Number(total) : NaN;
  if (!Number.isFinite(totalCents)) throw new Error("Ogiltig ordersumma");
  return {
    id,
    order_id: orderId,
    order_date: readString(row, "order_date").slice(0, 10),
    customer_name: readString(row, "customer_name"),
    customer_email: readString(row, "customer_email"),
    total_cents: totalCents,
    status: readString(row, "status"),
    created_at: readString(row, "created_at"),
    ...(alreadyExists ? { already_exists: true } : {}),
  };
}

const ORDER_COLUMNS =
  "id, order_id, order_date, customer_name, customer_email, total_cents, status, created_at";

/**
 * Stores an invoice as an offline Dirty Wine order, the same list as Admin → Bookings → Dirty Wine → Ordrar.
 * A second call with the same invoice number returns the existing row.
 */
export async function createB2bOrderFromInvoice(
  sb: SupabaseClient,
  input: unknown,
  createdBy: string | null,
): Promise<B2bOrderSummary> {
  const parsed = createB2bOrderSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const invoice = await getInvoice(sb, parsed.data.invoice_id);
  if (!invoice) throw new Error("Fakturan hittades inte");
  if (invoice.status === "void") {
    throw new Error(
      invoice.invoice_number
        ? `Faktura ${invoice.invoice_number} är makulerad och kan inte bli en order`
        : "Fakturan är makulerad och kan inte bli en order",
    );
  }
  if (invoice.lines.length === 0) throw new Error("Fakturan saknar rader");

  const orderKey = invoice.invoice_number?.trim() || `B2B-${invoice.id.slice(0, 8)}`;
  const { data: existing, error: existingError } = await sb
    .from("dirty_wine_orders")
    .select(ORDER_COLUMNS)
    .eq("order_id", orderKey)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  assertNoError(existingError);
  if (existing) return summaryOf(existing, true);

  const sender = invoice.sender_snapshot ? null : await loadInvoiceSenderDefaults(sb);
  const invoiceData = savedInvoiceToInvoiceData(invoice, sender);
  if (!invoiceData.invoiceNumber.trim()) invoiceData.invoiceNumber = orderKey;
  const totalCents = Math.max(0, Math.round(invoice.total_ore));

  const { data, error } = await sb
    .from("dirty_wine_orders")
    .insert({
      order_type: "offline",
      order_id: orderKey,
      order_date: invoice.invoice_date ?? invoiceData.date,
      customer_name: invoiceData.toName.trim(),
      customer_email: invoiceData.toEmail.trim(),
      total_cents: totalCents,
      status: "Manuell faktura",
      invoice_data: invoiceData,
      created_by: createdBy,
    })
    .select(ORDER_COLUMNS)
    .single();
  assertNoError(error);
  const summary = summaryOf(data, false);

  try {
    const {
      bottlesFromInvoiceData,
      logB2bOrderCreated,
      resolveIsFirstB2bOrder,
    } = await import("@/lib/analytics/b2b-events");
    const isFirstOrder = await resolveIsFirstB2bOrder(sb, {
      recipientId: invoice.recipient_id,
      customerKey: invoiceData.toEmail.trim() || null,
      excludeOrderId: summary.id,
      excludeInvoiceId: invoice.id,
    });
    await logB2bOrderCreated({
      orderId: summary.order_id,
      invoiceId: invoice.id,
      orderType: "offline",
      bottles: bottlesFromInvoiceData(invoiceData),
      amountSek: totalCents / 100,
      recipientId: invoice.recipient_id,
      isFirstOrder,
      userId: createdBy,
    });
  } catch (e) {
    console.error("b2b_order_created (dirty_wine_orders):", e);
  }

  return summary;
}

export async function listB2bOrders(sb: SupabaseClient): Promise<B2bOrderSummary[]> {
  const { data, error } = await sb
    .from("dirty_wine_orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);
  assertNoError(error);
  return (Array.isArray(data) ? data : []).map((row) => summaryOf(row));
}
