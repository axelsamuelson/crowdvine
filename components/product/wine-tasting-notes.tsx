"use client";

import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import { useTranslations } from "@/lib/hooks/use-translations";

interface WineTastingNotesProps {
  text: string;
}

export function WineTastingNotes({ text }: WineTastingNotesProps) {
  const { t } = useTranslations();
  const trimmed = text.trim();
  if (!trimmed) return null;

  return (
    <WineEnrichmentCollapsible title={t("product.pdp.tastingNotes")}>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {trimmed}
      </p>
    </WineEnrichmentCollapsible>
  );
}
