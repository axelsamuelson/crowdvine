"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { Product } from "@/lib/shopify/types";
import { BrowseProductCard } from "@/components/invite-shop/browse-product-card";
import { InviteProductModal } from "@/components/invite-shop/invite-product-modal";
import { Loader2 } from "lucide-react";

interface OtherInStockSectionProps {
  /** Wine IDs that were part of the tasting – exclude these from the list. */
  tastingWineIds: string[];
}

/**
 * Shows a heading and grid of wines that are in stock but were not included in the wine tasting.
 * Uses same card + modal as the business invite page.
 */
export function OtherInStockSection({ tastingWineIds }: OtherInStockSectionProps) {
  const code = useParams().code as string;
  const inviteBasePath = `/tasting/${code}/summary`;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  const excludeIds = new Set(tastingWineIds);

  useEffect(() => {
    fetch("/api/crowdvine/products?limit=200")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Product[]) => {
        const arr = Array.isArray(list) ? list : [];
        const inStockNotInTasting = arr.filter((p) => {
          const stock = (p as { b2bStock?: number | null }).b2bStock ?? null;
          const hasStock = stock != null && stock > 0;
          const wineId = p.id;
          const wasInTasting = excludeIds.has(wineId);
          return hasStock && !wasInTasting;
        });
        inStockNotInTasting.sort((a, b) => {
          const stockA = (a as { b2bStock?: number | null }).b2bStock ?? 0;
          const stockB = (b as { b2bStock?: number | null }).b2bStock ?? 0;
          return stockB - stockA;
        });
        setProducts(inStockNotInTasting);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [tastingWineIds.join(",")]);

  if (loading) {
    return (
      <section className="pt-4 pb-16 px-3 md:px-6 w-full">
        <div className="max-w-6xl mx-auto flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="pt-4 pb-16 px-3 md:px-6 w-full">
      <div className="w-full">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
          {products.map((product) => (
            <BrowseProductCard
              key={product.id}
              product={product}
              inviteBasePath={inviteBasePath}
              onProductClick={(handle) => setSelectedHandle(handle)}
            />
          ))}
        </div>
      </div>
      <InviteProductModal
        handle={selectedHandle}
        inviteBasePath={inviteBasePath}
        onClose={() => setSelectedHandle(null)}
      />
    </section>
  );
}
