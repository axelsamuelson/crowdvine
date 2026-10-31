import type { SupabaseClient } from "@supabase/supabase-js";
import { exitDiscountExcludedWineBoxIdsFromEnv } from "@/lib/exit-discount/config";
import type { PromoDiscountCartItem } from "@/lib/discount-codes";

/**
 * Wine IDs that must be excluded from the exit-discount base.
 * Sources: wine_boxes.exclude_from_exit_discount + EXIT_DISCOUNT_EXCLUDED_WINE_BOX_IDS.
 */
export async function loadExitDiscountExcludedWineIds(
  sb: SupabaseClient,
): Promise<Set<string>> {
  const envIds = exitDiscountExcludedWineBoxIdsFromEnv();
  const excluded = new Set<string>();

  const { data: flagged, error: flagErr } = await sb
    .from("wine_boxes")
    .select("id")
    .eq("exclude_from_exit_discount", true);
  if (flagErr) {
    console.error("[exit-discount] wine_boxes flag lookup failed:", flagErr);
  }

  const boxIds = new Set<string>([
    ...envIds,
    ...((flagged ?? []).map((r) => String(r.id).toLowerCase()) as string[]),
  ]);

  if (boxIds.size === 0) return excluded;

  const { data: items, error: itemsErr } = await sb
    .from("wine_box_items")
    .select("wine_id")
    .in("wine_box_id", [...boxIds]);
  if (itemsErr) {
    console.error("[exit-discount] wine_box_items lookup failed:", itemsErr);
    return excluded;
  }

  for (const row of items ?? []) {
    const id = String(row.wine_id || "").toLowerCase();
    if (id) excluded.add(id);
  }
  return excluded;
}

export function filterExitDiscountEligibleItems(
  items: PromoDiscountCartItem[],
  excludedWineIds: Set<string>,
): PromoDiscountCartItem[] {
  if (excludedWineIds.size === 0) return items;
  return items.filter(
    (item) => !excludedWineIds.has(String(item.wine_id).toLowerCase()),
  );
}

export function sumPromoItemsSek(items: PromoDiscountCartItem[]): number {
  let sum = 0;
  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const unit = Math.max(0, Number(item.unit_price) || 0);
    sum += qty * unit;
  }
  return sum;
}
