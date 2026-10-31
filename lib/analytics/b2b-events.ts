/**
 * Dirty Wine B2B funnel events (user_events, category b2b).
 * All logging is fire-and-forget: never throw into order/admin flows.
 * Do not put PII (names, emails, phones, addresses) in metadata.
 */
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import type { EventType } from "@/lib/analytics/event-tracker";
import type { SupabaseClient } from "@supabase/supabase-js";

export const DIRTYWINE_ANALYTICS_PAGE_URL = "https://dirtywine.se/";

export type B2bOrderType = "online" | "offline";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

async function logB2bSafe(
  eventType: EventType,
  metadata: Record<string, unknown>,
  extra?: { userId?: string | null; pageUrl?: string | null },
): Promise<void> {
  try {
    await logUserEventServer({
      eventType,
      eventCategory: "b2b",
      metadata,
      pageUrl: extra?.pageUrl ?? DIRTYWINE_ANALYTICS_PAGE_URL,
      userId: extra?.userId ?? null,
      userAgent: "server",
    });
  } catch (e) {
    console.error(`b2b event ${eventType}:`, e);
  }
}

/** Prior Dirty Wine ledger rows for the same recipient / customer key. */
export async function resolveIsFirstB2bOrder(
  sb: SupabaseClient,
  opts: {
    recipientId?: string | null;
    /** Digits-only / opaque customer key — never store raw email in event_metadata. */
    customerKey?: string | null;
    excludeOrderId?: string | null;
    excludeInvoiceId?: string | null;
  },
): Promise<boolean> {
  try {
    const recipientId = opts.recipientId?.trim() || null;
    const customerKey = opts.customerKey?.trim().toLowerCase() || null;

    if (recipientId) {
      let inv = sb
        .from("invoices")
        .select("id")
        .eq("recipient_id", recipientId)
        .limit(2);
      if (opts.excludeInvoiceId) {
        inv = inv.neq("id", opts.excludeInvoiceId);
      }
      const { data: invoices } = await inv;
      if ((invoices?.length ?? 0) > 0) return false;
    }

    if (customerKey) {
      let orders = sb
        .from("dirty_wine_orders")
        .select("id")
        .ilike("customer_email", customerKey)
        .limit(2);
      if (opts.excludeOrderId) {
        orders = orders.neq("id", opts.excludeOrderId);
      }
      const { data: rows } = await orders;
      if ((rows?.length ?? 0) > 0) return false;
    }

    return true;
  } catch (e) {
    console.error("resolveIsFirstB2bOrder:", e);
    return true;
  }
}

export async function logB2bTastingRequested(opts: {
  recipientId?: string | null;
  wineIds?: string[];
  bottles?: number;
  tastingSessionId?: string | null;
  userId?: string | null;
}): Promise<void> {
  const metadata: Record<string, unknown> = {};
  if (opts.recipientId) metadata.recipient_id = opts.recipientId;
  if (opts.wineIds?.length) metadata.wines = opts.wineIds;
  if (typeof opts.bottles === "number") metadata.bottles = opts.bottles;
  if (opts.tastingSessionId) metadata.tasting_session_id = opts.tastingSessionId;
  await logB2bSafe("b2b_tasting_requested", metadata, { userId: opts.userId });
}

export async function logB2bQuoteSent(opts: {
  recipientId?: string | null;
  wineIds?: string[];
  bottles?: number;
  amountSek?: number;
  invoiceId?: string | null;
  userId?: string | null;
}): Promise<void> {
  const metadata: Record<string, unknown> = {};
  if (opts.recipientId) metadata.recipient_id = opts.recipientId;
  if (opts.wineIds?.length) metadata.wines = opts.wineIds;
  if (typeof opts.bottles === "number") metadata.bottles = opts.bottles;
  if (typeof opts.amountSek === "number") metadata.amount_sek = opts.amountSek;
  if (opts.invoiceId) metadata.invoice_id = opts.invoiceId;
  await logB2bSafe("b2b_quote_sent", metadata, { userId: opts.userId });
}

export async function logB2bOrderCreated(opts: {
  orderId?: string | null;
  invoiceId?: string | null;
  orderType: B2bOrderType;
  bottles?: number;
  amountSek?: number;
  recipientId?: string | null;
  isFirstOrder: boolean;
  userId?: string | null;
}): Promise<void> {
  const metadata: Record<string, unknown> = {
    order_type: opts.orderType,
    is_first_order: opts.isFirstOrder,
  };
  if (opts.orderId) metadata.order_id = opts.orderId;
  if (opts.invoiceId) metadata.invoice_id = opts.invoiceId;
  if (typeof opts.bottles === "number") metadata.bottles = opts.bottles;
  if (typeof opts.amountSek === "number") metadata.amount_sek = opts.amountSek;
  if (opts.recipientId) metadata.recipient_id = opts.recipientId;
  await logB2bSafe("b2b_order_created", metadata, { userId: opts.userId });
}

/** Sum bottle quantities from invoice line-like rows. */
export function sumBottleQuantities(
  lines: Array<{ quantity?: number | null }> | null | undefined,
): number {
  if (!lines?.length) return 0;
  return lines.reduce((sum, line) => {
    const q = typeof line.quantity === "number" ? line.quantity : 0;
    return sum + (Number.isFinite(q) ? q : 0);
  }, 0);
}

export function wineIdsFromLines(
  lines: Array<{ wine_id?: string | null; wineId?: string | null }> | null | undefined,
): string[] {
  if (!lines?.length) return [];
  const ids: string[] = [];
  for (const line of lines) {
    const id = (line.wine_id || line.wineId || "").trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Best-effort bottles from Dirty Wine offline invoice_data JSON. */
export function bottlesFromInvoiceData(invoiceData: unknown): number {
  const rec = asRecord(invoiceData);
  if (!rec) return 0;
  const items = rec.items;
  if (!Array.isArray(items)) return 0;
  return sumBottleQuantities(
    items.map((item) => {
      const row = asRecord(item);
      const quantity = row && typeof row.quantity === "number" ? row.quantity : 0;
      return { quantity };
    }),
  );
}
