"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrencyBreakdown, formatCurrencyWhole } from "@/lib/price-breakdown";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=800&fit=crop";

function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/"))
    return `/api/images/${clean.replace("/uploads/", "")}`;
  return `/api/images/${clean}`;
}

export interface TastingWineModalData {
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
  cost_amount?: number | null;
  exchange_rate?: number | null;
  alcohol_tax_cents?: number | null;
  margin_percentage?: number | null;
  b2b_margin_percentage?: number | null;
  b2b_price_excl_vat?: number | null;
  b2b_cost_sek?: number | null;
  b2b_shipping_per_bottle_sek?: number | null;
  b2b_stock?: number | null;
}

export interface PriceBreakdown {
  costKr: number;
  alcoholTaxKr: number;
  shippingKr?: number;
  marginKr: number;
  totalExclVatKr: number;
}

function computeBreakdown(wine: TastingWineModalData): PriceBreakdown | null {
  const costAmount = wine.cost_amount;
  const exchangeRate = wine.exchange_rate ?? 1;
  const alcoholTaxCents = wine.alcohol_tax_cents ?? 0;
  if (costAmount == null || costAmount <= 0) return null;
  const costInSek = costAmount * exchangeRate;
  const alcoholTaxSek = alcoholTaxCents / 100;

  // B2B breakdown: use stored cost from admin (b2b_cost_sek) when present so Cost and Vinst match admin exactly
  const b2bPrice = wine.b2b_price_excl_vat;
  const b2bMarginPct = wine.b2b_margin_percentage;
  const shippingPerBottle = wine.b2b_shipping_per_bottle_sek ?? 0;
  const storedCostSek = wine.b2b_cost_sek;
  if (
    b2bPrice != null &&
    b2bMarginPct != null &&
    b2bMarginPct >= 0 &&
    b2bMarginPct < 100
  ) {
    const costRounded =
      storedCostSek != null && storedCostSek > 0
        ? Math.round(storedCostSek * 100) / 100
        : Math.round(costInSek * 100) / 100;
    const alcoholTaxRounded = Math.round(alcoholTaxSek * 100) / 100;
    const shippingRounded = Math.round(shippingPerBottle * 100) / 100;
    const margin = Math.round((b2bPrice - costRounded - alcoholTaxRounded - shippingRounded) * 100) / 100;
    return {
      costKr: costRounded,
      alcoholTaxKr: alcoholTaxRounded,
      shippingKr: shippingRounded > 0 ? shippingRounded : undefined,
      marginKr: margin,
      totalExclVatKr: Math.round(b2bPrice * 100) / 100,
    };
  }

  // B2C fallback: margin from margin_percentage
  const marginPct = wine.margin_percentage ?? 0;
  const marginSek = costInSek * (marginPct / 100);
  const total = costInSek + alcoholTaxSek + marginSek;
  return {
    costKr: Math.round(costInSek * 100) / 100,
    alcoholTaxKr: Math.round(alcoholTaxSek * 100) / 100,
    marginKr: Math.round(marginSek * 100) / 100,
    totalExclVatKr: Math.round(total * 100) / 100,
  };
}

interface TastingWineModalProps {
  wine: TastingWineModalData | null;
  priceExclVat: number | null;
  onClose: () => void;
}

export function TastingWineModal({
  wine,
  priceExclVat,
  onClose,
}: TastingWineModalProps) {
  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (wine) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [wine, onClose]);

  const breakdown = useMemo(() => (wine ? computeBreakdown(wine) : null), [wine]);

  const isOpen = !!wine;
  if (!wine) return null;

  const imageUrl = getImageUrl(wine.label_image_path) || FALLBACK_IMAGE;
  const title = [wine.wine_name, wine.vintage].filter(Boolean).join(" ");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-background rounded-xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
              onClick={onClose}
              aria-label="Stäng"
            >
              <X className="size-5" />
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8">
              {/* Vänster: flaska – samma som InviteProductModal */}
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                <Image
                  src={imageUrl}
                  alt={title}
                  fill
                  className="object-cover w-full h-full"
                  unoptimized={imageUrl.startsWith("/api/") || imageUrl.startsWith("http")}
                />
              </div>

              {/* Höger: info – exakt samma upplägg som InviteProductModal (dirtywine.se/b/...) */}
              <div className="flex flex-col">
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {title}
                </h2>
                {wine.producer_name && (
                  <p className="text-muted-foreground mb-4">
                    {wine.producer_name}
                  </p>
                )}

                {/* Pris – samma struktur som invite: label + bold belopp + "exkl. moms" under */}
                {priceExclVat != null && (
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">
                        Shipped from warehouse
                      </span>
                      <span className="flex flex-col">
                        <span className="text-xl font-semibold text-foreground">
                          {formatCurrencyWhole(priceExclVat)}
                        </span>
                        <span className="text-[8px] md:text-[10px] font-normal text-muted-foreground">
                          exkl. moms
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* COLOR & GRAPES – samma som InviteProductModal */}
                <div className="flex flex-wrap gap-4 mb-6">
                  {wine.color && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block">
                        Color
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {wine.color}
                      </p>
                    </div>
                  )}
                  {wine.grape_varieties && (
                    <div>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide block">
                        Grapes
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {wine.grape_varieties}
                      </p>
                    </div>
                  )}
                </div>

                {/* Price breakdown – B2B med 2 decimaler så att t.ex. alkoholskatt 22,19 kr visas korrekt */}
                {breakdown && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Price breakdown
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Cost:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrencyBreakdown(breakdown.costKr)}
                        </span>
                      </span>
                      <span>
                        Alcohol tax:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrencyBreakdown(breakdown.alcoholTaxKr)}
                        </span>
                      </span>
                      {breakdown.shippingKr != null && breakdown.shippingKr > 0 && (
                        <span>
                          Shipping:{" "}
                          <span className="font-medium text-foreground">
                            {formatCurrencyBreakdown(breakdown.shippingKr)}
                          </span>
                        </span>
                      )}
                      <span>
                        Margin:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrencyBreakdown(breakdown.marginKr)}
                        </span>
                      </span>
                      <span>
                        Total exkl. moms:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrencyWhole(breakdown.totalExclVatKr)}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Beskrivning – samma stil som invite (text-muted-foreground text-sm) */}
                {wine.description?.trim() && (
                  <div className="text-muted-foreground text-sm">
                    <p className="leading-relaxed whitespace-pre-wrap">
                      {wine.description.trim()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
