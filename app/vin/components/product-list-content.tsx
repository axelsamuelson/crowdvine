"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { Product, Collection } from "@/lib/shopify/types";
import ResultsControls from "./results-controls";
import { useProducts } from "@/components/shop/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { Card } from "../../../components/ui/card";
import { useTranslations } from "@/lib/hooks/use-translations";
import { filterProductsByGrapes } from "@/lib/shop/filter-products-by-grape";
import { filterProductsByFarming } from "@/lib/shop/farming-filter";

const ProductCard = dynamic(
  () => import("./product-card").then((mod) => ({ default: mod.ProductCard })),
  { loading: () => null },
);

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
  /** Server-rendered grid — shown until filters apply or idle enhancement. */
  children?: ReactNode;
}

// Normalize color string for comparison: "Red & White", "Red/White", "red-&-white" → canonical form
function normalizeColorForCompare(s: string | undefined | null): string {
  if (!s || typeof s !== "string") return "";
  return s
    .trim()
    .toLowerCase()
    .replace(/\s*[\/&]\s*/g, " & ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

// Client-side color filtering function
function filterProductsByColors(
  products: Product[],
  colors: string[],
): Product[] {
  if (!colors || colors.length === 0) {
    return products;
  }

  const filteredProducts = products.filter((product) => {
    const matchColor = (variantOrOptionColor: string | undefined | null) =>
      colors.some(
        (selectedColor) =>
          normalizeColorForCompare(selectedColor) ===
          normalizeColorForCompare(variantOrOptionColor),
      );

    // Check if product has any variants with the selected colors
    const hasMatchingColor = product.variants?.some((variant: any) => {
      if (!variant.selectedOptions) return false;
      return variant.selectedOptions.some((option: any) => {
        const isColorOption =
          option.name?.toLowerCase().includes("color") ||
          option.name?.toLowerCase().includes("colour");
        if (!isColorOption) return false;
        const variantColor = option.value ?? option.name;
        return matchColor(variantColor);
      });
    });

    // Also check product-level options as fallback
    if (!hasMatchingColor && product.options) {
      const colorOption = product.options.find(
        (opt: any) =>
          opt.name?.toLowerCase().includes("color") ||
          opt.name?.toLowerCase().includes("colour"),
      );
      if (colorOption?.values?.length) {
        const optionMatches = colorOption.values.some((value: any) => {
          const colorValue =
            typeof value === "string" ? value : value.name ?? value.id ?? "";
          return matchColor(colorValue);
        });
        if (optionMatches) return true;
      }
    }

    return !!hasMatchingColor;
  });

  return filteredProducts;
}

function filterProductsBySource(
  products: Product[],
  sourceSlugs: string[],
  wineSourceSlugs: Record<string, string[]>,
): Product[] {
  if (!sourceSlugs || sourceSlugs.length === 0 || !wineSourceSlugs) return products;
  const wanted = new Set(sourceSlugs);
  return products.filter((product) => {
    const slugs = wineSourceSlugs[product.id];
    if (!slugs || slugs.length === 0) return false;
    return slugs.some((s) => wanted.has(s));
  });
}

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
  collectionHandle,
  wineSourceSlugs = {},
  searchQuery = "",
  breadcrumbLabel,
  children,
}: ProductListContentProps & { collectionHandle?: string }) {
  const { t } = useTranslations();
  const { setProducts, setOriginalProducts, setAvailableSourceSlugs } = useProducts();
  const lastSearchTracked = useRef<string | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);

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

  const hasActiveFilters =
    (colorFilters?.length ?? 0) > 0 ||
    (grapeFilters?.length ?? 0) > 0 ||
    (farmingFilters?.length ?? 0) > 0 ||
    (sourceFilters?.length ?? 0) > 0;

  // After first paint, swap server grid for interactive cards (add-to-cart, etc.)
  useEffect(() => {
    if (hasActiveFilters) {
      setInteractiveReady(true);
      return;
    }

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setInteractiveReady(true), {
          timeout: 2500,
        })
      : window.setTimeout(() => setInteractiveReady(true), 2500);

    return () => {
      if (window.requestIdleCallback) {
        window.cancelIdleCallback(idle as number);
      } else {
        window.clearTimeout(idle as number);
      }
    };
  }, [hasActiveFilters]);

  const showInteractiveGrid = hasActiveFilters || interactiveReady || !children;

  // Apply client-side filtering whenever products or filters change
  const filteredProducts = useMemo(() => {
    let out = products;
    if (colorFilters?.length) out = filterProductsByColors(out, colorFilters);
    if (grapeFilters?.length) out = filterProductsByGrapes(out, grapeFilters);
    if (farmingFilters?.length) out = filterProductsByFarming(out, farmingFilters);
    if (sourceFilters?.length)
      out = filterProductsBySource(out, sourceFilters, wineSourceSlugs);
    return out;
  }, [products, colorFilters, grapeFilters, farmingFilters, sourceFilters, wineSourceSlugs]);

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
      />

      {filteredProducts.length > 0 ? (
        showInteractiveGrid ? (
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
          children
        )
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