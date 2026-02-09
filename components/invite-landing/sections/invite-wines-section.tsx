"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import type { Product } from "@/lib/shopify/types";
import { BrowseProductCard } from "@/components/invite-shop/browse-product-card";
import { InviteProductModal } from "@/components/invite-shop/invite-product-modal";
import { ProductGrid } from "@/app/shop/components/product-grid";
import { Loader2 } from "lucide-react";

/**
 * Shows the wine product grid inline on the business invite page.
 * Fetches products and displays them in the same style as the shop page.
 * Clicking a wine opens an animated modal instead of navigating.
 */
export function InviteWinesSection() {
  const params = useParams();
  const code = params.code as string;
  const inviteBasePath = `/b/${code}`;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHandle, setSelectedHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/crowdvine/products?limit=100`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Product[]) => {
        const arr = Array.isArray(list) ? list : [];
        arr.sort((a, b) => {
          const stockA = (a as any).b2bStock ?? null;
          const stockB = (b as any).b2bStock ?? null;
          const aInStock = stockA != null && stockA > 0;
          const bInStock = stockB != null && stockB > 0;
          if (aInStock === bInStock) return 0;
          return aInStock ? -1 : 1;
        });
        setProducts(arr);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto flex justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 px-3 md:px-6 w-full">
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
