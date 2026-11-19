"use client";

import { useEffect, useRef } from "react";

import type { CaseMode } from "@/components/cart/case-mode-selector";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { emitOnce } from "@/lib/analytics/emit-once";
import { resolveB2cUnitPriceSek } from "@/lib/pdp/b2c-unit-price";
import { getProductListPriceSek } from "@/lib/price-breakdown";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { Product } from "@/lib/shopify/types";

function isWholesalerSource(sourceType: string | null | undefined): boolean {
  const kind = sourceType?.trim().toLowerCase();
  return kind === "wholesaler" || kind === "wholesale";
}

/**
 * Six-bottle total and the mixing rule, under the case-mode selector.
 * Mixed cases can include other prices, so that mode is a "from" total.
 */
export function PdpCasePurchaseNotes({
  product,
  mode,
}: {
  product: Product;
  mode: CaseMode;
}) {
  const { t } = useTranslations();
  const { formatSek } = useDisplayMoney();
  const breakdown = useProductPrice(product, "producer");
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    emitOnce("six_pack_rule_viewed:pdp_info", () => {
      void AnalyticsTracker.trackEvent({
        eventType: "six_pack_rule_viewed",
        eventCategory: "engagement",
        metadata: { surface: "pdp_info" },
      });
    });
  }, []);

  const catalogAmount = Number(product.priceRange.minVariantPrice.amount);
  const unitSek = resolveB2cUnitPriceSek({
    listPriceSek: getProductListPriceSek(product),
    catalogAmount: Number.isFinite(catalogAmount) ? catalogAmount : null,
    breakdown,
  });
  const price =
    unitSek != null ? formatSek(unitSek * 6, { round: "round" }) : null;
  const totalLine =
    price == null
      ? null
      : mode === "mixed"
        ? t("product.pdp.caseTotalMixed", { price })
        : t("product.pdp.caseTotalSame", { price });
  const mixKey = isWholesalerSource(product.sourceType)
    ? "product.pdp.caseMixNoteShared"
    : "product.pdp.caseMixNote";

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {totalLine ? <p>{totalLine}</p> : null}
      <p>{t(mixKey)}</p>
    </div>
  );
}
