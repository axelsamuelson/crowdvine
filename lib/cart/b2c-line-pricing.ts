/**
 * B2C shared-pallet line pricing (CFO):
 * 1. Unit incl. VAT (after discount) → nearest whole krona, half up
 * 2. Line = unit × qty
 * 3. Order total = sum(lines) + shipping; VAT derived once from the total
 *
 * Stripe charge amount must equal that order total (öre = totalSek × 100).
 */

import { applyPalletDiscount, type DiscountTier } from "@/lib/pallet-discount";
import { memberDiscountedTotalInclVat } from "@/lib/price-breakdown";

/**
 * Binding B2C list unit from stored öre (`base_price_cents` /
 * `calculated_price_cents`). Half-up to whole kronor — never ceil/floor alone.
 * 29326 → 293, 31000 → 310.
 */
export function b2cWholeKronorFromOre(ore: number): number {
  if (!Number.isFinite(ore) || ore <= 0) return 0;
  return Math.round(ore / 100);
}

export function b2cDiscountedUnitSek(args: {
  listUnitSek: number;
  memberPercent: number;
  earlyBirdTier: DiscountTier;
}): number {
  const afterMember = memberDiscountedTotalInclVat(
    args.listUnitSek,
    args.memberPercent,
  );
  return applyPalletDiscount(afterMember, args.earlyBirdTier);
}

export function b2cLineTotalSek(args: {
  listUnitSek: number;
  memberPercent: number;
  earlyBirdTier: DiscountTier;
  quantity: number;
}): { unitSek: number; lineTotalSek: number } {
  const unitSek = b2cDiscountedUnitSek(args);
  const qty = Math.max(0, Math.floor(args.quantity));
  return { unitSek, lineTotalSek: unitSek * qty };
}

/** Convenience: öre → discounted whole-kronor unit × qty. */
export function b2cLineTotalSekFromOre(args: {
  listUnitOre: number;
  memberPercent: number;
  earlyBirdTier: DiscountTier;
  quantity: number;
}): { unitSek: number; lineTotalSek: number } {
  return b2cLineTotalSek({
    listUnitSek: b2cWholeKronorFromOre(args.listUnitOre),
    memberPercent: args.memberPercent,
    earlyBirdTier: args.earlyBirdTier,
    quantity: args.quantity,
  });
}
