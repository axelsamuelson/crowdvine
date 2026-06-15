"use client";

import Link from "next/link";
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
import { generateProducerSlug } from "@/lib/producer-handle";
import { producerPublicPath } from "@/lib/i18n/localized-routes";
import { wineColorDotClass } from "@/lib/wine-color";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { AppLocale } from "@/lib/i18n/locale";
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

const HIDDEN_TASTE_TAGS = new Set([
  "gateway_natural",
  "classic",
  "everyday",
  "collectors_item",
  "winemaker_signature",
]);

const MAX_VISIBLE_TASTE_TAGS = 5;

function formatTasteTagLabel(tag: string): string {
  const withSpaces = tag.replace(/_/g, " ");
  if (!withSpaces) return withSpaces;
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function resolveVisibleTasteTags(tags: string[] | null | undefined): string[] {
  if (!tags?.length) return [];
  return tags.filter((tag) => !HIDDEN_TASTE_TAGS.has(tag));
}

interface WineEnrichmentSpecsProps {
  enrichment: WineEnrichment | null | undefined;
  producerName?: string | null;
  className?: string;
  tasteTags?: string[];
}

function SpecItem({
  specKey,
  label,
  value,
  enrichment,
  locale,
}: {
  specKey: EnrichmentSpecKey;
  label: string;
  value: string;
  enrichment: WineEnrichment | null | undefined;
  locale: AppLocale;
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
        <dd className="mt-0.5 text-sm leading-snug text-foreground">
          {specKey === "producer" ? (
            <Link
              href={producerPublicPath(generateProducerSlug(value), locale)}
              className="underline underline-offset-2"
            >
              {value}
            </Link>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  );
}

function TasteTagsBlock({ tags }: { tags: string[] }) {
  const visible = resolveVisibleTasteTags(tags);
  if (visible.length === 0) return null;

  const displayed = visible.slice(0, MAX_VISIBLE_TASTE_TAGS);
  const overflow = visible.length - displayed.length;

  return (
    <div className="px-4 py-3 md:px-5">
      <p className={WINE_ENRICHMENT_SPEC_LABEL_CLASS}>Karaktär</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {displayed.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs text-stone-700"
          >
            {formatTasteTagLabel(tag)}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs text-stone-700">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function WineEnrichmentSpecs({
  enrichment,
  producerName,
  className = "",
  tasteTags,
}: WineEnrichmentSpecsProps) {
  const { t, context } = useTranslations();
  const specs = buildPdpSpecs(enrichment, context.locale, producerName);
  const entries = ENRICHMENT_SPEC_DISPLAY_ORDER.flatMap((key) => {
    const value = specs[key];
    return value ? ([[key, value] as const] as const) : [];
  });

  const resolvedTasteTags = tasteTags ?? enrichment?.taste_tags ?? [];

  if (entries.length === 0 && resolvedTasteTags.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {entries.length > 0 ? (
        <dl className="grid grid-cols-2 gap-2">
          {entries.map(([key, value]) => (
            <SpecItem
              key={key}
              specKey={key}
              label={t(enrichmentSpecLabelKey(key))}
              value={value}
              enrichment={enrichment}
              locale={context.locale}
            />
          ))}
        </dl>
      ) : null}
      {resolvedTasteTags.length > 0 ? (
        <TasteTagsBlock tags={resolvedTasteTags} />
      ) : null}
    </div>
  );
}
