"use client";

import { ExternalLink } from "lucide-react";
import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import { useTranslations } from "@/lib/hooks/use-translations";
import { useDisplayMoney } from "@/lib/hooks/use-display-money";

export interface CompetitorOffer {
  price_source_name: string | null;
  pdp_url: string;
  /** Price already converted to SEK (kr). */
  price_amount_sek: number | null;
  /** Vintage/year as shown on the competitor's listing (from their title). */
  vintage?: number | null;
  /** Rating from source (e.g. Vivino 0–5). */
  rating?: number | null;
}

interface CompetitorOffersSectionProps {
  offers: CompetitorOffer[];
}

/** First letter of the store name (or fallback) for a local avatar — no external requests. */
function getStoreInitial(name: string | null, fallback: string): string {
  const source = (name?.trim() || fallback).trim();
  const letter = source.charAt(0);
  return letter ? letter.toLocaleUpperCase() : "?";
}

/**
 * Collapsible list of competitor sites where the wine is available, with price and link.
 */
export function CompetitorOffersSection({ offers }: CompetitorOffersSectionProps) {
  const { t } = useTranslations();
  if (!offers || offers.length === 0) return null;

  return (
    <WineEnrichmentCollapsible title={t("product.pdp.alsoAvailableAt")}>
      <ul className="flex flex-col gap-1">
        {offers.map((offer, index) => (
          <CompetitorOfferRow key={index} offer={offer} />
        ))}
      </ul>
    </WineEnrichmentCollapsible>
  );
}

function CompetitorOfferRow({ offer }: { offer: CompetitorOffer }) {
  const { t } = useTranslations();
  const { formatSek } = useDisplayMoney();
  const otherStore = t("product.pdp.otherStore");
  const storeName = offer.price_source_name ?? otherStore;
  const initial = getStoreInitial(offer.price_source_name, otherStore);
  const year = offer.vintage != null ? String(offer.vintage) : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-b-0">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span
          className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] font-semibold uppercase leading-none text-muted-foreground"
          aria-hidden
        >
          {initial}
        </span>
        {storeName}
      </span>
      <div className="flex items-center gap-3">
        {offer.rating != null ? (
          <span
            className="text-sm text-foreground/65"
            title={t("product.pdp.ratingFromSource")}
          >
            {Number(offer.rating).toFixed(1)}
          </span>
        ) : null}
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {offer.price_amount_sek != null
            ? formatSek(offer.price_amount_sek)
            : "—"}
          {year ? (
            <span className="ml-1.5 font-normal text-foreground/65">
              ({year})
            </span>
          ) : null}
        </span>
        <a
          href={offer.pdp_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t("product.pdp.viewOffer")}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </li>
  );
}
