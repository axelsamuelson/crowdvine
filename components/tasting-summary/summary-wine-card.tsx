"use client";

import React, { memo } from "react";
import Image from "next/image";
import { StockBadge } from "@/components/product/stock-badge";

export interface SummaryWineCardData {
  id: string;
  wine_name: string;
  vintage: string;
  producer_name?: string | null;
  label_image_path?: string | null;
  grape_varieties?: string | null;
  color?: string | null;
  description?: string | null;
  base_price_cents?: number | null;
  price_includes_vat?: boolean | null;
  /** B2B-lager (pallar eller wines.b2b_stock) – samma källa som dirtywine.se/shop */
  b2b_stock?: number | null;
}

interface SummaryWineCardProps {
  wine: SummaryWineCardData;
  /** Pris exkl. moms (beräknat från base_price_cents om tillgängligt) */
  priceExclVat: number | null;
  /** Optional image URL resolver */
  getImageUrl?: (path: string | null | undefined) => string | null;
  /** Vid klick – öppna modul med vininfo */
  onWineClick?: () => void;
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop";

function defaultGetImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/"))
    return `/api/images/${clean.replace("/uploads/", "")}`;
  return `/api/images/${clean}`;
}

/** Total price without decimals – round to nearest integer (120.20 → 120, 120.59 → 121) */
function formatPriceKr(priceExclVat: number): string {
  const rounded = Math.round(priceExclVat);
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(rounded) + " KR";
}

/**
 * Wine card: samma stil som BrowseProductCard, visar titel/producent och pris exkl. moms.
 * Klick öppnar modul med vininfo (onWineClick).
 */
export const SummaryWineCard = memo(
  ({
    wine,
    priceExclVat,
    getImageUrl = defaultGetImageUrl,
    onWineClick,
  }: SummaryWineCardProps) => {
    const imageUrl = getImageUrl(wine.label_image_path) || FALLBACK_IMAGE;
    const title = [wine.wine_name, wine.vintage].filter(Boolean).join(" ");

    const content = (
      <>
        <div className="relative size-full">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover size-full"
            sizes="(max-width: 768px) 50vw, 20vw"
            unoptimized={imageUrl.startsWith("/api/") || imageUrl.startsWith("http")}
          />
        </div>

        {/* Overlay: vänster = namn, producent, In stock; höger = pris som på referensbilden */}
        <div className="absolute inset-0 pl-1 pr-2 pt-2 pb-2 md:p-2 w-full pointer-events-none">
          <div className="flex gap-2 md:gap-6 justify-between items-start md:items-baseline px-1 md:px-3 py-1 w-full font-semibold">
            <div className="flex flex-col min-w-0 max-w-[42%] md:max-w-[40%] shrink md:shrink-0 rounded-r pr-1.5 md:pr-0 md:rounded-none py-1 md:py-0 -my-1 md:my-0 overflow-hidden">
              <p className="text-[8px] leading-tight md:text-sm uppercase 2xl:text-base text-balance line-clamp-2 md:line-clamp-2 break-words overflow-hidden text-foreground">
                {title}
              </p>
              {wine.producer_name && (
                <p className="text-[7px] md:text-xs text-muted-foreground font-normal line-clamp-1 md:line-clamp-1 mt-0.5 leading-tight">
                  {wine.producer_name}
                </p>
              )}
              <StockBadge
                b2bStock={wine.b2b_stock}
                availableForSale={false}
                className="mt-0.5"
              />
            </div>
            <div className="flex flex-col items-end min-w-0 shrink md:max-w-[35%] md:shrink-0 gap-0 text-right overflow-hidden">
              {priceExclVat != null ? (
                <>
                  <span className="text-[9px] md:text-sm 2xl:text-base font-bold tabular-nums text-foreground uppercase">
                    {formatPriceKr(priceExclVat)}
                  </span>
                  <span className="text-[7px] md:text-[9px] text-muted-foreground font-normal uppercase mt-0.5">
                    EXKL. MOMS
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground font-normal text-[9px] md:text-sm">–</span>
              )}
            </div>
          </div>
        </div>
      </>
    );

    return (
      <div className="relative w-full aspect-[3/4] md:aspect-square bg-muted group overflow-hidden">
        {onWineClick ? (
          <button
            type="button"
            onClick={onWineClick}
            className="block size-full focus-visible:outline-none cursor-pointer text-left"
            aria-label={`Visa information om ${title}`}
          >
            {content}
          </button>
        ) : (
          <div className="block size-full text-left">{content}</div>
        )}
      </div>
    );
  },
);

SummaryWineCard.displayName = "SummaryWineCard";
