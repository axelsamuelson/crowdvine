"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { Product, Collection } from "@/lib/shopify/types";
import ResultsControls from "./results-controls";
import { useProducts } from "@/components/shop/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { ProductCard } from "./product-card";
import { Card } from "../../../components/ui/card";
import { useTranslations } from "@/lib/hooks/use-translations";
import { applyShopUrlFilters } from "@/lib/shop/apply-shop-url-filters";

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
  /** Map wine id -> price source slugs that have an offer for that wine. Used for competitor filter. */
  wineSourceSlugs?: Record<string, string[]>;
  /** Shop search query from URL (?q=), for analytics. */
  searchQuery?: string;
  /** Override last breadcrumb segment (e.g. wine category h1). */
  breadcrumbLabel?: string;
  producerProfileHref?: string;
  producerProfileLabel?: string;
}

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
  collectionHandle,
  wineSourceSlugs = {},
  searchQuery = "",
  breadcrumbLabel,
  producerProfileHref,
  producerProfileLabel,
}: ProductListContentProps & { collectionHandle?: string }) {
  const { t } = useTranslations();
  const { setProducts, setOriginalProducts, setAvailableSourceSlugs } = useProducts();
  const lastSearchTracked = useRef<string | null>(null);

  // Tell the sidebar which "Buy at" sources have at least one wine in this list (hide empty options)
  useLayoutEffect(() => {
    if (products.length === 0) {
      setAvailableSourceSlugs([]);
      return;
    }
    const slugs = new Set<string>();
    for (const p of products) {
      for (const s of wineSourceSlugs[p.id] ?? []) slugs.add(s);
    }
    setAvailableSourceSlugs(Array.from(slugs));
  }, [products, wineSourceSlugs, setAvailableSourceSlugs]);

  // Get current filters from URL
  const [colorFilters] = useQueryState(
    "fcolor",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [grapeFilters] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [sourceFilters] = useQueryState(
    "fsource",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [farmingFilters] = useQueryState(
    "ffarming",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Apply client-side filtering whenever products or filters change
  const filteredProducts = useMemo(
    () =>
      applyShopUrlFilters(
        products,
        {
          fcolor: colorFilters,
          fgrape: grapeFilters,
          ffarming: farmingFilters,
          fsource: sourceFilters,
        },
        wineSourceSlugs,
      ),
    [products, colorFilters, grapeFilters, farmingFilters, sourceFilters, wineSourceSlugs],
  );

  // Set both original and filtered products in the provider whenever they change
  useLayoutEffect(() => {
    setOriginalProducts(products);
    setProducts(filteredProducts);
  }, [products, filteredProducts, setProducts, setOriginalProducts]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || lastSearchTracked.current === q) return;
    lastSearchTracked.current = q;

    const track = () => {
      void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) =>
        AnalyticsTracker.trackEvent({
          eventType: "search_submitted",
          eventCategory: "search",
          metadata: { queryLength: q.length },
        }),
      );
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(track, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(track, 500);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const parts: string[] = [];
    if (colorFilters.length) parts.push(`color:${colorFilters.length}`);
    if (grapeFilters.length) parts.push(`grape:${grapeFilters.length}`);
    if (farmingFilters.length) parts.push(`farming:${farmingFilters.length}`);
    if (sourceFilters.length) parts.push(`source:${sourceFilters.length}`);
    if (selectedProducers.length)
      parts.push(`producer:${selectedProducers.length}`);
    if (parts.length === 0) return;

    const t = window.setTimeout(() => {
      void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) =>
        AnalyticsTracker.trackEvent({
          eventType: "filter_used",
          eventCategory: "navigation",
          metadata: { summary: parts.join("|") },
        }),
      );
    }, 800);
    return () => window.clearTimeout(t);
  }, [colorFilters, grapeFilters, farmingFilters, sourceFilters, selectedProducers]);

  // Track product list viewed event (deferred — not on critical path)
  useEffect(() => {
    const track = () => {
      const isCollectionPage =
        !!collectionHandle &&
        collectionHandle !== "joyco-root" &&
        collectionHandle !== "all-wines";

      const shownProducts = filteredProducts.slice(0, 200);
      const productIds = shownProducts.map((p) => p.id);
      const producerIds = Array.from(
        new Set(
          shownProducts
            .map((p: Product & { producerId?: string }) => p.producerId)
            .filter(Boolean),
        ),
      ) as string[];

      void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) => {
        void AnalyticsTracker.trackEvent({
          eventType: "product_list_viewed",
          eventCategory: "navigation",
          metadata: {
            productCount: filteredProducts.length,
            totalProducts: products.length,
            hasFilters:
              colorFilters.length > 0 ||
              grapeFilters.length > 0 ||
              farmingFilters.length > 0 ||
              sourceFilters.length > 0 ||
              selectedProducers.length > 0 ||
              isCollectionPage,
            collectionHandle: collectionHandle,
            isCollectionPage: isCollectionPage,
            productIds,
            producerIds,
          },
        });

        if (isCollectionPage && collectionHandle) {
          void AnalyticsTracker.trackEvent({
            eventType: "collection_viewed",
            eventCategory: "navigation",
            metadata: { collectionHandle },
          });
        }
        if (selectedProducers.length > 0) {
          void AnalyticsTracker.trackEvent({
            eventType: "producer_viewed",
            eventCategory: "navigation",
            metadata: { producerCount: selectedProducers.length },
          });
        }
      });
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(track, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(track, 1500);
    return () => window.clearTimeout(t);
  }, [
    filteredProducts.length,
    products.length,
    colorFilters.length,
    grapeFilters.length,
    farmingFilters.length,
    sourceFilters.length,
    selectedProducers.length,
    collectionHandle,
  ]);

  return (
    <>
      <ResultsControls
        className="max-md:hidden"
        collections={collections}
        products={filteredProducts}
        breadcrumbLabel={breadcrumbLabel}
        producerProfileHref={producerProfileHref}
        producerProfileLabel={producerProfileLabel}
      />

      {filteredProducts.length > 0 ? (
        <ProductGrid>
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              listSearchQuery={searchQuery}
            />
          ))}
        </ProductGrid>
      ) : (
        <Card className="flex mr-sides flex-1 items-center justify-center">
          <p className="text text-muted-foreground font-medium">
            {t("shop.noProductsFound")}
          </p>
        </Card>
      )}
    </>
  );
}
