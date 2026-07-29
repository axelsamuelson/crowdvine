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
import {
  useQueryState,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";
import { ProductGrid } from "./product-grid";
import { ProductCard } from "./product-card";
import { Card } from "../../../components/ui/card";
import { useTranslations } from "@/lib/hooks/use-translations";
import { Button } from "@/components/ui/button";
import { ShopSearchScopeTabs } from "./shop-search-scope-tabs";
import {
  countProductsBySearchScope,
  filterAndRankProductsBySearch,
  SHOP_SEARCH_SCOPES,
  type ShopSearchScope,
} from "@/lib/shop/shop-product-search";
import { filterProductsByColors } from "@/lib/shop/filter-products-by-color";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";
import { filterProductsByFarming } from "@/lib/shop/farming-filter";
import { filterProductsBySource } from "@/lib/shop/filter-products-by-source";

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
  /** Map wine id -> price source slugs that have an offer for that wine. Used for competitor filter. */
  wineSourceSlugs?: Record<string, string[]>;
  /** Shop search query from URL (?q=), for analytics / SSR. */
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
  const { setProducts, setOriginalProducts, setAvailableSourceSlugs } =
    useProducts();
  const lastSearchTracked = useRef<string | null>(null);

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
  const [urlQ, setQ] = useQueryState(
    "q",
    parseAsString.withOptions({ shallow: true, history: "replace" }),
  );
  const [qscope, setQscope] = useQueryState(
    "qscope",
    parseAsStringLiteral([...SHOP_SEARCH_SCOPES])
      .withDefault("all")
      .withOptions({
        shallow: true,
        history: "replace",
      }),
  );

  const activeSearchQuery = (urlQ ?? searchQuery ?? "").trim();
  const activeScope: ShopSearchScope = qscope;

  const facetBaseProducts = useMemo(() => {
    let out = products;
    if (colorFilters.length) out = filterProductsByColors(out, colorFilters);
    if (grapeFilters.length) out = filterProductsByGrapes(out, grapeFilters);
    if (farmingFilters.length) out = filterProductsByFarming(out, farmingFilters);
    if (sourceFilters.length) {
      out = filterProductsBySource(out, sourceFilters, wineSourceSlugs);
    }
    return out;
  }, [
    products,
    colorFilters,
    grapeFilters,
    farmingFilters,
    sourceFilters,
    wineSourceSlugs,
  ]);

  const scopeCounts = useMemo(
    () => countProductsBySearchScope(facetBaseProducts, activeSearchQuery),
    [facetBaseProducts, activeSearchQuery],
  );

  const filteredProducts = useMemo(() => {
    if (!activeSearchQuery) return facetBaseProducts;
    return filterAndRankProductsBySearch(
      facetBaseProducts,
      activeSearchQuery,
      activeScope,
    );
  }, [facetBaseProducts, activeSearchQuery, activeScope]);

  useEffect(() => {
    if (!activeSearchQuery) {
      if (qscope !== "all") void setQscope(null);
      return;
    }
    if (
      activeScope !== "all" &&
      scopeCounts[activeScope] === 0 &&
      scopeCounts.all > 0
    ) {
      void setQscope(null);
    }
  }, [activeSearchQuery, activeScope, scopeCounts, qscope, setQscope]);

  useLayoutEffect(() => {
    setOriginalProducts(products);
    setProducts(filteredProducts);
  }, [products, filteredProducts, setProducts, setOriginalProducts]);

  useEffect(() => {
    const q = activeSearchQuery;
    if (!q || lastSearchTracked.current === `${q}|${activeScope}`) return;
    lastSearchTracked.current = `${q}|${activeScope}`;

    const track = () => {
      void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) =>
        AnalyticsTracker.trackEvent({
          eventType: "search_submitted",
          eventCategory: "search",
          metadata: {
            queryLength: q.length,
            resultCount: filteredProducts.length,
            scope: activeScope,
          },
        }),
      );
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(track, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(track, 500);
    return () => window.clearTimeout(timer);
  }, [activeSearchQuery, activeScope, filteredProducts.length]);

  useEffect(() => {
    const parts: string[] = [];
    if (colorFilters.length) parts.push(`color:${colorFilters.length}`);
    if (grapeFilters.length) parts.push(`grape:${grapeFilters.length}`);
    if (farmingFilters.length) parts.push(`farming:${farmingFilters.length}`);
    if (sourceFilters.length) parts.push(`source:${sourceFilters.length}`);
    if (selectedProducers.length)
      parts.push(`producer:${selectedProducers.length}`);
    if (parts.length === 0) return;

    const timer = window.setTimeout(() => {
      void import("@/lib/analytics/event-tracker").then(({ AnalyticsTracker }) =>
        AnalyticsTracker.trackEvent({
          eventType: "filter_used",
          eventCategory: "navigation",
          metadata: { summary: parts.join("|") },
        }),
      );
    }, 800);
    return () => window.clearTimeout(timer);
  }, [
    colorFilters,
    grapeFilters,
    farmingFilters,
    sourceFilters,
    selectedProducers,
  ]);

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

      void import("@/lib/analytics/event-tracker").then(
        ({ AnalyticsTracker }) => {
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
                activeSearchQuery.length > 0 ||
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
        },
      );
    };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(track, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(track, 1500);
    return () => window.clearTimeout(timer);
  }, [
    filteredProducts.length,
    products.length,
    colorFilters.length,
    grapeFilters.length,
    farmingFilters.length,
    sourceFilters.length,
    selectedProducers.length,
    collectionHandle,
    activeSearchQuery.length,
  ]);

  const clearSearch = () => {
    void setQ(null);
    void setQscope(null);
  };

  const setScope = (scope: ShopSearchScope) => {
    void setQscope(scope === "all" ? null : scope);
  };

  return (
    <>
      <ResultsControls
        className="max-md:hidden"
        collections={collections}
        products={filteredProducts}
        breadcrumbLabel={breadcrumbLabel}
        producerProfileHref={producerProfileHref}
        producerProfileLabel={producerProfileLabel}
        searchQuery={activeSearchQuery}
        onClearSearch={clearSearch}
      />

      {activeSearchQuery ? (
        <div className="mb-3 w-full px-sides md:pr-sides">
          <ShopSearchScopeTabs
            value={activeScope}
            onChange={setScope}
            counts={scopeCounts}
          />
        </div>
      ) : null}

      {filteredProducts.length > 0 ? (
        <ProductGrid>
          {filteredProducts.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              index={index}
              listSearchQuery={activeSearchQuery}
            />
          ))}
        </ProductGrid>
      ) : (
        <Card className="mr-sides flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p className="text-base font-medium text-foreground">
            {activeSearchQuery
              ? t("shop.noSearchResults", { query: activeSearchQuery })
              : t("shop.noProductsFound")}
          </p>
          {activeSearchQuery ? (
            <>
              <p className="max-w-sm text-sm text-muted-foreground">
                {t("shop.noSearchResultsHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 cursor-pointer"
                onClick={clearSearch}
              >
                {t("shop.clearSearch")}
              </Button>
            </>
          ) : null}
        </Card>
      )}
    </>
  );
}
