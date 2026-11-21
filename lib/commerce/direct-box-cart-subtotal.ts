/**
 * Sum cart lines at direct_box bottle prices (catalog × markup, whole kronor).
 * Shared by quote / payment-intent / confirm so Delsumma matches charged total.
 */

import {
  directBoxUnitPriceSek,
  getDirectBoxPriceMarkupPercent,
} from "@/lib/commerce/direct-box-pricing";

type CartLineLike = {
  quantity?: number | null;
  cost?: { totalAmount?: { amount?: string | number | null } | null } | null;
  merchandise?: {
    product?: { producerBoostActive?: boolean | null } | null;
  } | null;
};

export type DirectBoxCartMoney = {
  subtotalSek: number;
  boostedLineTotalSek: number;
  nonBoostedLineTotalSek: number;
  markupPercent: number;
};

export function sumDirectBoxCartMoney(
  lines: CartLineLike[] | null | undefined,
  markupPercent: number = getDirectBoxPriceMarkupPercent(),
): DirectBoxCartMoney {
  let subtotalSek = 0;
  let boostedLineTotalSek = 0;
  let nonBoostedLineTotalSek = 0;
  const pct = markupPercent;
  for (const line of lines ?? []) {
    const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
    const lineTotal = parseFloat(String(line.cost?.totalAmount?.amount ?? "")) || 0;
    const catalogUnit = qty > 0 ? lineTotal / qty : 0;
    const amt = directBoxUnitPriceSek(catalogUnit, pct) * qty;
    subtotalSek += amt;
    if (line.merchandise?.product?.producerBoostActive === true) {
      boostedLineTotalSek += amt;
    } else {
      nonBoostedLineTotalSek += amt;
    }
  }
  return {
    subtotalSek,
    boostedLineTotalSek,
    nonBoostedLineTotalSek,
    markupPercent: pct,
  };
}
