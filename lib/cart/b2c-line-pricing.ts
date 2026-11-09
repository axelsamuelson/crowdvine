/**
 * B2C shared-pallet line pricing: round the discounted unit (incl. VAT) to
 * whole kronor first, then line total = unit × qty. Stripe charge amount must
 * equal the sum of these line totals (+ shipping).
 */

import { applyPalletDiscount, type DiscountTier } from "@/lib/pallet-discount";
import { memberDiscountedTotalInclVat } from "@/lib/price-breakdown";

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
