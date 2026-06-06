"use client";

import { WineFoodPairing } from "@/components/product/wine-food-pairing";
import { WineTastingNotes } from "@/components/product/wine-tasting-notes";
import { WineExpandableDetails } from "@/components/product/wine-expandable-details";
import { WINE_ENRICHMENT_DROPDOWN_LIST_CLASS } from "@/components/product/wine-enrichment-collapsible";
import { WinePdpEnrichmentMotion } from "@/components/product/wine-pdp-enrichment-motion";
import {
  hasExpandableEnrichment,
  hasText,
} from "@/lib/product/wine-enrichment";
import type { WineEnrichment } from "@/lib/shopify/types";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

export const WINE_ENRICHMENT_DROPDOWN_GAP_CLASS = WINE_ENRICHMENT_DROPDOWN_LIST_CLASS;

interface WinePdpEnrichmentProps {
  enrichment: WineEnrichment | null | undefined;
  className?: string;
}

export function WinePdpEnrichment({
  enrichment,
  className,
}: WinePdpEnrichmentProps) {
  const { t } = useTranslations();
  const tastingNotes = enrichment?.tasting_notes?.trim();
  const foodPairing = enrichment?.food_pairing?.filter((i) => i?.trim()) ?? [];
  const hasExpandable = hasExpandableEnrichment(enrichment);
  const hasTasting = hasText(tastingNotes);

  if (!hasTasting && foodPairing.length === 0 && !hasExpandable) {
    return null;
  }

  return (
    <section
      className={cn(WINE_ENRICHMENT_DROPDOWN_GAP_CLASS, "col-span-full", className)}
      aria-label={t("product.pdp.wineCharacterAria")}
    >
      <WinePdpEnrichmentMotion className={WINE_ENRICHMENT_DROPDOWN_GAP_CLASS}>
        {hasTasting ? <WineTastingNotes text={tastingNotes!} /> : null}
        {foodPairing.length > 0 ? (
          <WineFoodPairing items={foodPairing} />
        ) : null}
        {hasExpandable ? (
          <WineExpandableDetails enrichment={enrichment} />
        ) : null}
      </WinePdpEnrichmentMotion>
    </section>
  );
}
