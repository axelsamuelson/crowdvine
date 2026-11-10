import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";

/**
 * Customer-facing confirmation total: wine (post-discount) + shipping,
 * rounded to whole kronor (matches checkout CTA / approved copy).
 */
export function confirmationDisplayTotalSek(input: {
  totalSek: number | null | undefined;
  shippingRevenueGrossCents?: number | null | undefined;
  wineSubtotalCentsFallback?: number | null | undefined;
}): number {
  const shippingSek =
    Math.max(0, Math.round(Number(input.shippingRevenueGrossCents) || 0)) / 100;
  const wineTotalSek =
    input.totalSek != null && Number.isFinite(Number(input.totalSek))
      ? Number(input.totalSek)
      : Math.max(0, Number(input.wineSubtotalCentsFallback) || 0) / 100;
  return Math.round(wineTotalSek + shippingSek);
}

/**
 * Map fulfillment_channel to the legacy confirmation `order_type` field.
 * Avoid selecting a missing `order_type` column on older/preview DBs.
 */
export function confirmationOrderTypeFromFulfillment(
  fulfillmentChannel: string | null | undefined,
): "warehouse" | "producer" {
  return fulfillmentChannel === "warehouse" ||
    fulfillmentChannel === "direct_box"
    ? "warehouse"
    : "producer";
}

export type ConfirmationLineInput = {
  quantity: number;
  /** Catalog list unit in öre (`base_price_cents`). */
  listUnitOre: number;
};

/**
 * Allocate the charged wine total across lines as whole kronor.
 * List units use {@link b2cWholeKronorFromOre}; largest-remainder so
 * sum(line_total_sek) === winesTotalSek exactly.
 */
export function confirmationChargedLineTotalsSek(args: {
  lines: ReadonlyArray<ConfirmationLineInput>;
  winesTotalSek: number;
}): number[] {
  const winesTotalSek = Math.max(0, Math.round(Number(args.winesTotalSek) || 0));
  const lines = args.lines ?? [];
  if (lines.length === 0) return [];

  const listTotals = lines.map((line) => {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const unitSek = b2cWholeKronorFromOre(Number(line.listUnitOre) || 0);
    return unitSek * qty;
  });
  const listSum = listTotals.reduce((s, n) => s + n, 0);

  if (listSum <= 0) {
    // Degenerate catalog — put entire charged wine on first line.
    return lines.map((_, i) => (i === 0 ? winesTotalSek : 0));
  }

  if (listSum === winesTotalSek) return listTotals;

  // Pro-rate with floor, then distribute remainder by largest fractional part.
  const scaled = listTotals.map((list) => {
    const exact = (list * winesTotalSek) / listSum;
    const floor = Math.floor(exact);
    return { floor, frac: exact - floor };
  });
  let remaining =
    winesTotalSek - scaled.reduce((s, row) => s + row.floor, 0);
  const order = scaled
    .map((row, index) => ({ index, frac: row.frac }))
    .sort((a, b) => b.frac - a.frac);
  const out = scaled.map((row) => row.floor);
  for (const { index } of order) {
    if (remaining <= 0) break;
    out[index] += 1;
    remaining -= 1;
  }
  return out;
}

/** True when a zone/pallet name is a customer-safe label (not an Unknown… stub). */
export function isCustomerFacingLabel(
  value: string | null | undefined,
): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (/^unknown\b/i.test(trimmed)) return false;
  return true;
}

/** Short readable reservation reference (first 8 hex of UUID). */
export function shortReservationReference(id: string): string {
  const hex = String(id || "")
    .replace(/-/g, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 8)
    .toUpperCase();
  return hex || String(id || "").slice(0, 8).toUpperCase();
}

/**
 * Customer status copy key for shared-pallet / reservation statuses.
 * Returns null when the badge should be hidden.
 */
export function confirmationStatusMessageKey(
  status: string | null | undefined,
): string | null {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  const map: Record<string, string> = {
    pending_producer_approval: "checkout.successStatusWaitingPallet",
    awaiting_pallet_close: "checkout.successStatusWaitingPallet",
    placed: "checkout.successStatusPlaced",
    confirmed: "checkout.successStatusConfirmed",
    shipped: "checkout.successStatusShipped",
    delivered: "checkout.successStatusDelivered",
    cancelled: "checkout.successStatusCancelled",
    canceled: "checkout.successStatusCancelled",
  };
  return map[s] ?? null;
}
