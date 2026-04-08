"use client";

import { useEffect, useMemo, useRef } from "react";
import { Product, Collection } from "@/lib/shopify/types";
import { ProductCard } from "./product-card";
import ResultsControls from "./results-controls";
import { useProducts } from "../providers/products-provider";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { ProductGrid } from "./product-grid";
import { Card } from "../../../components/ui/card";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

interface ProductListContentProps {
  products: Product[];
  collections: Collection[];
  selectedProducers?: string[];
  collectionHandle?: string;
  /** Map wine id -> price source slugs that have an offer for that wine. Used for competitor filter. */
  wineSourceSlugs?: Record<string, string[]>;
  /** Shop search query from URL (?q=), for analytics. */
  searchQuery?: string;
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

function filterProductsByGrapes(products: Product[], grapes: string[]): Product[] {
  if (!grapes || grapes.length === 0) return products;

  const wanted = new Set(grapes.map((g) => g.toLowerCase()));
  return products.filter((product) => {
    // Prefer explicit "Grape Varieties" option if present
    const opt = product.options?.find((o: any) =>
      String(o?.name || "").toLowerCase().includes("grape"),
    );
    if (opt?.values?.length) {
      return opt.values.some((v: any) => {
        const name = typeof v === "string" ? v : v?.name;
        return name && wanted.has(String(name).toLowerCase());
      });
    }

    // Fallback: variant selected options
    if (product.variants?.length) {
      return product.variants.some((variant: any) => {
        return (variant?.selectedOptions || []).some((so: any) => {
          const n = String(so?.name || "").toLowerCase();
          if (!n.includes("grape")) return false;
          const value = String(so?.value || "").toLowerCase();
          return wanted.has(value);
        });
      });
    }

    // Last fallback: tags
    if (product.tags?.length) {
      return product.tags.some((t) => wanted.has(String(t || "").toLowerCase()));
    }

    return false;
  });
}

export function ProductListContent({
  products,
  collections,
  selectedProducers = [],
  collectionHandle,
  wineSourceSlugs = {},
  searchQuery = "",
}: ProductListContentProps & { collectionHandle?: string }) {
  const { setProducts, setOriginalProducts, setAvailableSourceSlugs } = useProducts();
  const lastSearchTracked = useRef<string | null>(null);

  // Tell the sidebar which "Buy at" sources have at least one wine in this list (hide empty options)
  useEffect(() => {
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

  // Apply client-side filtering whenever products or filters change
  const filteredProducts = useMemo(() => {
    let out = products;
    if (colorFilters?.length) out = filterProductsByColors(out, colorFilters);
    if (grapeFilters?.length) out = filterProductsByGrapes(out, grapeFilters);
    if (sourceFilters?.length)
      out = filterProductsBySource(out, sourceFilters, wineSourceSlugs);
    return out;
  }, [products, colorFilters, grapeFilters, sourceFilters, wineSourceSlugs]);

  // Set both original and filtered products in the provider whenever they change
  useEffect(() => {
    setOriginalProducts(products);
    setProducts(filteredProducts);
  }, [products, filteredProducts, setProducts, setOriginalProducts]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || lastSearchTracked.current === q) return;
    lastSearchTracked.current = q;
    void AnalyticsTracker.trackEvent({
      eventType: "search_submitted",
      eventCategory: "search",
      metadata: { queryLength: q.length },
    });
  }, [searchQuery]);

  useEffect(() => {
    const parts: string[] = [];
    if (colorFilters.length) parts.push(`color:${colorFilters.length}`);
    if (grapeFilters.length) parts.push(`grape:${grapeFilters.length}`);
    if (sourceFilters.length) parts.push(`source:${sourceFilters.length}`);
    if (selectedProducers.length)
      parts.push(`producer:${selectedProducers.length}`);
    if (parts.length === 0) return;
    const t = window.setTimeout(() => {
      void AnalyticsTracker.trackEvent({
        eventType: "filter_used",
        eventCategory: "navigation",
        metadata: { summary: parts.join("|") },
      });
    }, 800);
    return () => window.clearTimeout(t);
  }, [colorFilters, grapeFilters, sourceFilters, selectedProducers]);

  // Track product list viewed event
  useEffect(() => {
    // Check if viewing a collection (producer filter)
    const isCollectionPage = !!collectionHandle && collectionHandle !== 'joyco-root' && collectionHandle !== 'all-wines';

    // For PLP/PDP analytics by dimension (wine/producer), we attach the products shown in this list view.
    // Keep payload bounded to avoid huge JSON in `event_metadata`.
    const shownProducts = filteredProducts.slice(0, 200);
    const productIds = shownProducts.map((p) => p.id);
    const producerIds = Array.from(
      new Set(
        shownProducts
          .map((p: any) => p.producerId as string | undefined)
          .filter(Boolean),
      ),
    );
    
    void AnalyticsTracker.trackEvent({
      eventType: "product_list_viewed",
      eventCategory: "navigation",
      metadata: { 
        productCount: filteredProducts.length,
        totalProducts: products.length,
        hasFilters: colorFilters.length > 0 || grapeFilters.length > 0 || sourceFilters.length > 0 || selectedProducers.length > 0 || isCollectionPage,
        collectionHandle: collectionHandle,
        isCollectionPage: isCollectionPage,
        productIds,
        producerIds,
      }
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
  }, [filteredProducts.length, products.length, colorFilters.length, grapeFilters.length, sourceFilters.length, selectedProducers.length, collectionHandle]);

  return (
    <>
      <ResultsControls
        className="max-md:hidden"
        collections={collections}
        products={filteredProducts}
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
            No products found
          </p>
        </Card>
      )}
    </>
  );
}