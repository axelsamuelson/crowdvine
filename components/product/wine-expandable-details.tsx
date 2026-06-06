"use client";

import { Quote } from "lucide-react";
import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import {
  formatStringList,
  hasExpandableEnrichment,
} from "@/lib/product/wine-enrichment";
import type { WineEnrichment } from "@/lib/shopify/types";
import { WINE_ENRICHMENT_DROPDOWN_LIST_CLASS } from "@/components/product/wine-enrichment-collapsible";
import { useTranslations } from "@/lib/hooks/use-translations";

interface WineExpandableDetailsProps {
  enrichment: WineEnrichment | null | undefined;
}

export function WineExpandableDetails({ enrichment }: WineExpandableDetailsProps) {
  const { t } = useTranslations();
  if (!hasExpandableEnrichment(enrichment)) return null;

  const ageing = enrichment?.ageing?.trim();
  const winemakerNotes = enrichment?.winemaker_notes?.trim();
  const awards = enrichment?.awards?.filter((a) => a.trim()) ?? [];
  const awardsText = formatStringList(enrichment?.awards);

  return (
    <div className={WINE_ENRICHMENT_DROPDOWN_LIST_CLASS}>
      {ageing ? (
        <WineEnrichmentCollapsible title={t("product.pdp.ageing")}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {ageing}
          </p>
        </WineEnrichmentCollapsible>
      ) : null}

      {winemakerNotes ? (
        <WineEnrichmentCollapsible title={t("product.pdp.winemakerNotes")}>
          <figure className="relative rounded-md border border-border/50 px-4 py-4">
            <Quote
              className="absolute right-3 top-3 h-4 w-4 text-muted-foreground/40"
              aria-hidden
            />
            <blockquote className="text-sm leading-relaxed text-foreground/90">
              {winemakerNotes}
            </blockquote>
          </figure>
        </WineEnrichmentCollapsible>
      ) : null}

      {awards.length > 0 ? (
        <WineEnrichmentCollapsible title={t("product.pdp.awards")}>
          {awards.length <= 3 && awardsText ? (
            <p className="text-sm leading-relaxed text-foreground/90">{awardsText}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {awards.map((award) => (
                <li
                  key={award}
                  className="rounded-full border border-border/80 px-2.5 py-1 text-xs text-foreground/80"
                >
                  {award}
                </li>
              ))}
            </ul>
          )}
        </WineEnrichmentCollapsible>
      ) : null}
    </div>
  );
}
