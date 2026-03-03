"use client";

import React from "react";

export interface TastingPdfWine {
  wine_name: string;
  vintage: string;
  grape_varieties?: string | null;
  label_image_path?: string | null;
  producer_name?: string | null;
  b2b_price_excl_vat?: number | null;
  base_price_cents?: number | null;
  price_includes_vat?: boolean | null;
}

export interface TastingPdfSession {
  name: string;
  created_at?: string;
  completed_at?: string | null;
}

function formatPrice(wine: TastingPdfWine): string {
  if (wine.b2b_price_excl_vat != null && wine.b2b_price_excl_vat > 0) {
    return `${Math.round(wine.b2b_price_excl_vat)} kr`;
  }
  const cents = wine.base_price_cents ?? 0;
  if (cents <= 0) return "–";
  const inclVat = wine.price_includes_vat !== false;
  const sek = inclVat ? cents / 100 / 1.25 : cents / 100;
  return `${Math.round(sek)} kr`;
}

function getImageSrc(path: string | null | undefined, baseUrl: string): string {
  if (!path) return "";
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/")) {
    const fileName = clean.replace("/uploads/", "");
    return `${baseUrl}/api/images/${encodeURIComponent(fileName)}`;
  }
  return `${baseUrl}/api/images/${encodeURIComponent(clean)}`;
}

const A4_WIDTH_PX = 794;

/**
 * Template rendered off-screen for PDF capture via html2canvas (same approach as invoice).
 * Uses real <img> tags so the browser loads images and they are included in the canvas.
 * Images keep original aspect ratio (object-contain in a bottle-shaped box). Content can span multiple pages.
 */
export function TastingPdfTemplate({
  session,
  wines,
  baseUrl,
}: {
  session: TastingPdfSession;
  wines: TastingPdfWine[];
  baseUrl: string;
}) {
  return (
    <div
      className="bg-white text-neutral-900"
      style={{
        width: A4_WIDTH_PX,
        fontFamily: "system-ui, sans-serif",
        padding: "24px",
      }}
    >
      <h1 className="text-2xl font-bold text-neutral-800 mb-1">
        {session.name || "Vinprovning"}
      </h1>
      <p className="text-sm text-neutral-500 mb-1">Vinlistan</p>
      <p className="text-xs text-neutral-500 mb-10">Alla priser är exkl. moms</p>

      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
      >
        {wines.map((wine, i) => (
          <div
            key={i}
            className="flex gap-4 p-4 border border-neutral-100 rounded-lg"
          >
            {/* Bottle-shaped box: more space for image, keeps original aspect ratio (object-contain) */}
            <div
              className="shrink-0 rounded overflow-hidden bg-neutral-50 flex items-center justify-center"
              style={{ width: 88, height: 140 }}
            >
              {wine.label_image_path ? (
                <img
                  src={getImageSrc(wine.label_image_path, baseUrl)}
                  alt=""
                  style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              ) : (
                <span className="text-neutral-400 text-xs">–</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-neutral-900 text-sm leading-tight">
                {wine.wine_name} {wine.vintage}
              </p>
              {wine.producer_name && (
                <p className="text-xs text-neutral-500 mt-1">
                  {wine.producer_name}
                </p>
              )}
              {wine.grape_varieties && (
                <p className="text-xs text-neutral-600 mt-1 break-words">
                  {wine.grape_varieties}
                </p>
              )}
              <p className="font-semibold text-neutral-900 text-sm mt-2">
                {formatPrice(wine)} exkl. moms
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
