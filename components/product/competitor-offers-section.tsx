"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";

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

function formatSek(amount: number | null): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Section on PDP that lists competitor sites where the wine is available, with price and link.
 * Matches the design of ProductPriceInfoBox (same box style and typography).
 */
export function CompetitorOffersSection({ offers }: CompetitorOffersSectionProps) {
  if (!offers || offers.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 overflow-clip px-3 py-2 rounded-md bg-popover md:gap-x-4 md:gap-y-4">
      <h2 className="text-lg font-semibold text-foreground lg:text-xl 2xl:text-2xl shrink-0">
        Also available at
      </h2>
      <ul className="flex flex-col gap-3">
        {offers.map((offer, index) => (
          <CompetitorOfferRow key={index} offer={offer} />
        ))}
      </ul>
    </div>
  );
}

function CompetitorOfferRow({ offer }: { offer: CompetitorOffer }) {
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
        {offer.price_source_name ?? "Other store"}
      </span>
      <div className="flex items-center gap-3">
        {offer.rating != null ? (
          <span className="text-sm text-muted-foreground" title="Betyg från källan">
            {Number(offer.rating).toFixed(1)}
          </span>
        ) : null}
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {formatSek(offer.price_amount_sek)}
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
          View
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </li>
  );
}
