"use client";

import { useEffect, useMemo } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Product } from "@/lib/shopify/types";

function extractGrapesFromProduct(product: Product): string[] {
  const out = new Set<string>();

  // 1) Product options (API already adds "Grape Varieties")
  const opt = product.options?.find((o) =>
    o.name?.toLowerCase().includes("grape"),
  );
  (opt?.values || []).forEach((v: any) => {
    const name = typeof v === "string" ? v : v?.name;
    if (name) out.add(String(name).trim());
  });

  // 2) Variant selected options fallback
  (product.variants || []).forEach((variant: any) => {
    (variant?.selectedOptions || []).forEach((so: any) => {
      const n = String(so?.name || "").toLowerCase();
      if (!n.includes("grape")) return;
      const value = String(so?.value || "").trim();
      if (value) out.add(value);
    });
  });

  // 3) Tags fallback (API also adds grapes as tags)
  (product.tags || []).forEach((t) => {
    const v = String(t || "").trim();
    if (!v) return;
    out.add(v);
  });

  // Remove color-ish tags (since API also adds color as tag)
  // We only want grape-like values; cheap heuristic: exclude common colors.
  ["red", "white", "orange", "rose", "rosé"].forEach((c) => out.delete(c));
  ["Red", "White", "Orange", "Rose", "Rosé"].forEach((c) => out.delete(c));

  return Array.from(out).filter(Boolean);
}

export function useAvailableGrapes(products: Product[]) {
  const [grapes, setGrapes] = useQueryState(
    "fgrape",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const availableGrapes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      extractGrapesFromProduct(p).forEach((g) => set.add(g));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Auto-remove unavailable filters
  useEffect(() => {
    if (grapes.length === 0) return;
    const allowed = new Set(availableGrapes);
    const valid = grapes.filter((g) => allowed.has(g));
    if (valid.length !== grapes.length) setGrapes(valid);
  }, [grapes, setGrapes, availableGrapes]);

  const toggleGrape = (grape: string) => {
    setGrapes(
      grapes.includes(grape)
        ? grapes.filter((g) => g !== grape)
        : [...grapes, grape],
    );
  };

  const selectedGrapes = availableGrapes.filter((g) => grapes.includes(g));

  return {
    availableGrapes,
    selectedGrapes,
    toggleGrape,
    activeGrapeFilters: grapes,
  };
}

