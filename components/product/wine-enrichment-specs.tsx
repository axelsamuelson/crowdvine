"use client";

import {
  Circle,
  Grape,
  Landmark,
  Layers,
  Leaf,
  MapPin,
  Mountain,
  Thermometer,
  Wine,
  type LucideIcon,
} from "lucide-react";
import { WINE_ENRICHMENT_LINE_FRAME_CLASS, WINE_ENRICHMENT_SPEC_LABEL_CLASS } from "@/lib/product/wine-enrichment-ui";
import {
  buildPdpSpecs,
  ENRICHMENT_SPEC_DISPLAY_ORDER,
  enrichmentSpecLabelKey,
  type EnrichmentSpecKey,
} from "@/lib/product/wine-enrichment";
import type { WineEnrichment } from "@/lib/shopify/types";
import { wineColorDotClass } from "@/lib/wine-color";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

const SPEC_ICONS: Record<EnrichmentSpecKey, LucideIcon> = {
  color: Circle,
  producer: Landmark,
  grapeVariety: Grape,
  appellation: MapPin,
  farmingAndAdditives: Leaf,
  abv: Wine,
  servingTemp: Thermometer,
  elevation: Mountain,
  soilType: Layers,
};

interface WineEnrichmentSpecsProps {
  enrichment: WineEnrichment | null | undefined;
  producerName?: string | null;
  className?: string;
}

function SpecItem({
  specKey,
  label,
  value,
  enrichment,
}: {
  specKey: EnrichmentSpecKey;
  label: string;
  value: string;
  enrichment: WineEnrichment | null | undefined;
}) {
  const Icon = SPEC_ICONS[specKey] ?? MapPin;

  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 px-4 py-3 md:px-5",
        WINE_ENRICHMENT_LINE_FRAME_CLASS,
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground/60">
        {specKey === "color" && enrichment?.color ? (
          <span
            className={cn(
              "h-3.5 w-3.5 rounded-full",
              wineColorDotClass(enrichment.color),
            )}
            aria-hidden
          />
        ) : (
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <dt className={WINE_ENRICHMENT_SPEC_LABEL_CLASS}>
          {label}
        </dt>
        <dd className="mt-0.5 text-sm leading-snug text-foreground">{value}</dd>
      </div>
    </div>
  );
}

export function WineEnrichmentSpecs({
  enrichment,
  producerName,
  className = "",
}: WineEnrichmentSpecsProps) {
  const { t, context } = useTranslations();
  const specs = buildPdpSpecs(enrichment, context.locale, producerName);
  const entries = ENRICHMENT_SPEC_DISPLAY_ORDER.flatMap((key) => {
    const value = specs[key];
    return value ? ([[key, value] as const] as const) : [];
  });

  if (entries.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-2 gap-2", className)}>
      {entries.map(([key, value]) => (
        <SpecItem
          key={key}
          specKey={key}
          label={t(enrichmentSpecLabelKey(key))}
          value={value}
          enrichment={enrichment}
        />
      ))}
    </dl>
  );
}
