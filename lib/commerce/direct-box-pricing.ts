/**
 * Direct-box commercial pricing (Axel 2026-11-11 01:24).
 *
 * - Bottle: catalog/pallet unit × (1 + markup%), rounded to whole kronor.
 * - Shipping: SEK 149 incl. VAT per box of 6 (= total bottles / 6).
 * - Markup percent from env DIRECT_BOX_PRICE_MARKUP_PERCENT (default 5).
 * Never hardcode 1.05 / 1.12 at call sites — use these helpers.
 */

export const DIRECT_BOX_PACK_BOTTLES = 6;
export const DIRECT_BOX_DEFAULT_MARKUP_PERCENT = 5;
/** Default per-box shipping incl. VAT (öre). Seeded rate should match. */
export const DIRECT_BOX_DEFAULT_SHIPPING_PER_BOX_ORE = 14_900;

export function getDirectBoxPriceMarkupPercent(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): number {
  const raw = String(env.DIRECT_BOX_PRICE_MARKUP_PERCENT ?? "").trim();
  if (!raw) return DIRECT_BOX_DEFAULT_MARKUP_PERCENT;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return DIRECT_BOX_DEFAULT_MARKUP_PERCENT;
  }
  return n;
}

/**
 * Catalog/pallet unit price (SEK major) → direct unit price, whole kronor.
 */
export function directBoxUnitPriceSek(
  catalogUnitSek: number,
  markupPercent: number = DIRECT_BOX_DEFAULT_MARKUP_PERCENT,
): number {
  const base = Math.max(0, Number(catalogUnitSek) || 0);
  const pct = Math.max(0, Number(markupPercent) || 0);
  return Math.round(base * (1 + pct / 100));
}

export function directBoxLineTotalSek(
  catalogUnitSek: number,
  quantity: number,
  markupPercent: number = DIRECT_BOX_DEFAULT_MARKUP_PERCENT,
): number {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  return directBoxUnitPriceSek(catalogUnitSek, markupPercent) * qty;
}

/** Full boxes from total bottles (packing rule guarantees multiple of 6). */
export function directBoxCountFromBottles(bottleCount: number): number {
  const n = Math.max(0, Math.floor(Number(bottleCount) || 0));
  if (n <= 0 || n % DIRECT_BOX_PACK_BOTTLES !== 0) return 0;
  return n / DIRECT_BOX_PACK_BOTTLES;
}

export function directBoxShippingOre(input: {
  bottleCount: number;
  /** Flat fee per box of 6, incl. VAT, in öre. */
  feePerBoxOre?: number;
}): { boxes: number; shippingOre: number; complete: boolean; reason: string } {
  const bottles = Math.max(0, Math.floor(Number(input.bottleCount) || 0));
  const fee = Math.max(
    0,
    Math.round(
      input.feePerBoxOre ?? DIRECT_BOX_DEFAULT_SHIPPING_PER_BOX_ORE,
    ),
  );
  if (bottles <= 0) {
    return {
      boxes: 0,
      shippingOre: 0,
      complete: false,
      reason: "No bottles",
    };
  }
  if (bottles % DIRECT_BOX_PACK_BOTTLES !== 0) {
    return {
      boxes: 0,
      shippingOre: 0,
      complete: false,
      reason: `Bottle count ${bottles} is not a multiple of ${DIRECT_BOX_PACK_BOTTLES}`,
    };
  }
  const boxes = bottles / DIRECT_BOX_PACK_BOTTLES;
  return {
    boxes,
    shippingOre: fee * boxes,
    complete: true,
    reason: `${boxes} box(es) × ${fee} öre`,
  };
}

export function directBoxShippingSek(input: {
  bottleCount: number;
  feePerBoxOre?: number;
}): { boxes: number; shippingSek: number; complete: boolean; reason: string } {
  const r = directBoxShippingOre(input);
  return {
    boxes: r.boxes,
    shippingSek: r.shippingOre / 100,
    complete: r.complete,
    reason: r.reason,
  };
}
