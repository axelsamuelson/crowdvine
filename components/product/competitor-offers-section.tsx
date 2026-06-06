"use client";

import { useState } from "react";
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

/** Favicon URL from site origin. Uses Google's favicon service for reliability. */
function getFaviconUrl(pdpUrl: string): string | null {
  try {
    const host = new URL(pdpUrl).hostname;
    if (!host) return null;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`;
  } catch {
    return null;
  }
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
  const faviconUrl = getFaviconUrl(offer.pdp_url);
  const [faviconError, setFaviconError] = useState(false);
  const showFavicon = faviconUrl && !faviconError;
  const year = offer.vintage != null ? String(offer.vintage) : null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-border last:border-b-0">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        {showFavicon ? (
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={faviconUrl}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
              onError={() => setFaviconError(true)}
            />
          </span>
        ) : null}
        {offer.price_source_name ?? t("product.pdp.otherStore")}
      </span>
      <div className="flex items-center gap-3">
        {offer.rating != null ? (
          <span
            className="text-sm text-muted-foreground"
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
            <span className="ml-1.5 font-normal text-muted-foreground">
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
