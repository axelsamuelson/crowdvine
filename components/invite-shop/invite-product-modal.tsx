"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberPrice } from "@/components/ui/member-price";
import { useB2BPriceMode } from "@/lib/hooks/use-b2b-price-mode";
import { useProductPrice } from "@/lib/hooks/use-product-price";
import Prose from "@/components/prose";
import { SimpleProductImage } from "./simple-product-image";
import { calculatePriceBreakdown, formatCurrency } from "@/lib/price-breakdown";
import type { Product } from "@/lib/shopify/types";

interface InviteProductModalProps {
  handle: string | null;
  inviteBasePath: string;
  onClose: () => void;
}

export function InviteProductModal({
  handle,
  inviteBasePath,
  onClose,
}: InviteProductModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const showExclVat = useB2BPriceMode();
  
  // Get both producer and warehouse prices for B2B sites
  // Always call hooks in the same order (Rules of Hooks)
  // useProductPrice handles null products by returning null
  const producerBreakdown = useProductPrice(product || ({} as Product), "producer");
  const warehouseBreakdown = useProductPrice(product || ({} as Product), "warehouse");

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (handle) {
      document.addEventListener("keydown", onEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [handle, onClose]);

  useEffect(() => {
    if (!handle) {
      setProduct(null);
      return;
    }
    setLoading(true);
    fetch(`/api/crowdvine/products/${handle}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((p: Product | null) => {
        setProduct(p);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [handle]);

  const isOpen = !!handle;

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
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal panel */}
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
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>

            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : product ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 p-6 md:p-8">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                  <SimpleProductImage
                    product={product}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col">
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {product.title}
                  </h2>
                  {product.producerName && (
                    <p className="text-muted-foreground mb-4">
                      {product.producerName}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 mb-6">
                    {showExclVat && producerBreakdown && warehouseBreakdown ? (
                      <>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">
                            Producer
                          </span>
                          <MemberPrice
                            amount={product.priceRange.minVariantPrice.amount}
                            currencyCode={
                              product.priceRange.minVariantPrice.currencyCode
                            }
                            className="text-xl font-semibold"
                            calculatedTotalPrice={producerBreakdown.total / 1.25}
                            forceShowExclVat={true}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground mb-1">
                            Warehouse
                          </span>
                          <MemberPrice
                            amount={product.priceRange.minVariantPrice.amount}
                            currencyCode={
                              product.priceRange.minVariantPrice.currencyCode
                            }
                            className="text-xl font-semibold"
                            calculatedTotalPrice={warehouseBreakdown.total}
                            forceShowExclVat={true}
                          />
                        </div>
                      </>
                    ) : (
                      <MemberPrice
                        amount={product.priceRange.minVariantPrice.amount}
                        currencyCode={
                          product.priceRange.minVariantPrice.currencyCode
                        }
                        className="text-xl font-semibold"
                        showBadge={showExclVat}
                        priceExclVatOverride={
                          product.priceBreakdown?.b2bPriceExclVat ??
                          (product as any).b2bPriceExclVat
                        }
                      />
                    )}
                  </div>

                  {/* Färg & Druvor */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    {(() => {
                      const colorOpt = product.options?.find(
                        (o) =>
                          o.name === "Color" ||
                          o.name?.toLowerCase() === "color"
                      );
                      const grapeOpt = product.options?.find(
                        (o) =>
                          o.name === "Grape Varieties" ||
                          o.name?.toLowerCase().includes("grape")
                      );
                      const colorVal =
                        colorOpt?.values?.[0] &&
                        typeof colorOpt.values[0] === "object"
                          ? (colorOpt.values[0] as { name: string }).name
                          : Array.isArray(colorOpt?.values)
                            ? String(colorOpt.values[0])
                            : null;
                      const grapeVal =
                        grapeOpt?.values
                          ?.map((v) =>
                            typeof v === "object"
                              ? (v as { name: string }).name
                              : String(v)
                          )
                          .filter(Boolean)
                          .join(", ") || null;
                      if (!colorVal && !grapeVal) return null;
                      return (
                        <>
                          {colorVal && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                Color
                              </span>
                              <p className="text-sm font-medium text-foreground">
                                {colorVal}
                              </p>
                            </div>
                          )}
                          {grapeVal && (
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                                Grapes
                              </span>
                              <p className="text-sm font-medium text-foreground">
                                {grapeVal}
                              </p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Price breakdown - compact */}
                  {product.priceBreakdown && (
                    <div className="mb-6">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Price breakdown
                      </h3>
                      {(() => {
                        try {
                          const pb = product.priceBreakdown;
                          const b2bPrice =
                            pb.b2bPriceExclVat ??
                            (product as any).b2bPriceExclVat;

                          if (showExclVat && b2bPrice != null && pb.b2bMarginPercentage != null) {
                            const costAmountInSek = pb.costAmount * pb.exchangeRate;
                            const alcoholTaxInSek = (pb.alcoholTaxCents || 0) / 100;
                            const costInSek = costAmountInSek + alcoholTaxInSek;
                            const margin = b2bPrice - costInSek;
                            const items = [
                              { label: "Cost", val: costAmountInSek },
                              { label: "Alcohol tax", val: alcoholTaxInSek },
                              { label: "Margin", val: margin },
                            ];
                            return (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {items.map(({ label, val }) => (
                                  <span key={label}>
                                    {label}:{" "}
                                    <span className="font-medium text-foreground">
                                      {formatCurrency(val)}
                                    </span>
                                  </span>
                                ))}
                                <span>
                                  Total exkl. moms:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(b2bPrice)}
                                  </span>
                                </span>
                              </div>
                            );
                          }

                          const b = calculatePriceBreakdown(
                            {
                              cost_amount: pb.costAmount,
                              exchange_rate: pb.exchangeRate,
                              alcohol_tax_cents: pb.alcoholTaxCents,
                              margin_percentage: pb.marginPercentage,
                              base_price_cents:
                                Number(
                                  product.priceRange.minVariantPrice.amount
                                ) * 100,
                            },
                            0
                          );
                          const items = [
                            { label: "Cost", val: b.cost },
                            { label: "Alcohol tax", val: b.alcoholTax },
                            { label: "Margin", val: b.margin },
                            { label: "VAT", val: b.vat },
                          ];
                          return (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {items.map(({ label, val }) => (
                                <span key={label}>
                                  {label}:{" "}
                                  <span className="font-medium text-foreground">
                                    {formatCurrency(val)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          );
                        } catch {
                          return null;
                        }
                      })()}
                    </div>
                  )}

                  {(product.descriptionHtml || product.description) && (
                    <div className="text-muted-foreground text-sm">
                      <Prose
                        html={
                          product.descriptionHtml ||
                          `<p>${product.description}</p>`
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground">
                <p>Product not found</p>
                <Button variant="outline" className="mt-4" onClick={onClose}>
                  Close
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
