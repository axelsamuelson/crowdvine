import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchResolvedSellableB2BStock } from "@/lib/b2b-pallet-stock";

export type InquiryStockLine = {
  wineId: string;
  quantity: number;
};

/**
 * Ensure every line is within B2B warehouse remaining (quantity − quantity_sold /
 * resolved sellable stock). Returns missing or short wine ids.
 */
export async function assertInquiryLinesInB2bStock(
  sb: SupabaseClient,
  lines: InquiryStockLine[],
): Promise<{ ok: true } | { ok: false; shortfalls: Array<{ wineId: string; available: number; requested: number }> }> {
  const wineIds = lines.map((l) => l.wineId);
  const stock = await fetchResolvedSellableB2BStock(sb, wineIds);
  const shortfalls: Array<{
    wineId: string;
    available: number;
    requested: number;
  }> = [];

  for (const line of lines) {
    const available = stock.get(line.wineId);
    const qty = available == null ? 0 : Math.max(0, available);
    if (qty < line.quantity) {
      shortfalls.push({
        wineId: line.wineId,
        available: qty,
        requested: line.quantity,
      });
    }
  }

  if (shortfalls.length > 0) return { ok: false, shortfalls };
  return { ok: true };
}
