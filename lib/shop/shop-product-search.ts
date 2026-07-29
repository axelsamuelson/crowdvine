import type { Product } from "@/lib/shopify/types";

export const SHOP_SEARCH_SCOPES = ["all", "wine", "producer", "grape"] as const;
export type ShopSearchScope = (typeof SHOP_SEARCH_SCOPES)[number];

export function isShopSearchScope(value: string | null | undefined): value is ShopSearchScope {
  return (
    value === "all" ||
    value === "wine" ||
    value === "producer" ||
    value === "grape"
  );
}

export function parseShopSearchScope(
  value: string | null | undefined,
): ShopSearchScope {
  return isShopSearchScope(value) ? value : "all";
}

/** Fold accents/case for tolerant matching (e.g. Révolte ≈ revolte). */
export function foldShopSearchText(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9&\s/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Synonyms so locale-aware color/farming terms match English catalog values.
 * Keys and values are already folded.
 */
const TOKEN_SYNONYMS: Record<string, readonly string[]> = {
  red: ["red", "rott", "rouge"],
  rott: ["red", "rott"],
  rouge: ["red", "rouge"],
  white: ["white", "vitt", "blanc"],
  vitt: ["white", "vitt"],
  blanc: ["white", "blanc"],
  orange: ["orange", "amber"],
  rose: ["rose", "rosa", "pink"],
  rosa: ["rose", "rosa"],
  sparkling: ["sparkling", "mousseux", "bubbel", "petnat"],
  bubbel: ["sparkling", "bubbel", "mousseux"],
  mousseux: ["sparkling", "mousseux"],
  petnat: ["sparkling", "petnat"],
  natural: ["natural", "naturligt", "nature", "nat"],
  naturligt: ["natural", "naturligt"],
  organic: ["organic", "organic_certified", "ekologiskt", "bio"],
  ekologiskt: ["organic", "organic_certified", "ekologiskt"],
  biodynamic: ["biodynamic", "biodynamic_certified", "biodynamiskt"],
  biodynamiskt: ["biodynamic", "biodynamic_certified", "biodynamiskt"],
};

function expandToken(token: string): string[] {
  const syn = TOKEN_SYNONYMS[token];
  if (!syn) return [token];
  return Array.from(new Set(syn.map((s) => foldShopSearchText(s)).filter(Boolean)));
}

export function tokenizeShopSearch(raw: string): string[] {
  const folded = foldShopSearchText(raw.replace(/,/g, " "));
  if (!folded) return [];
  return folded
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function extractColorValues(product: Product): string[] {
  const out: string[] = [];
  const colorOption = product.options?.find(
    (opt) =>
      opt.name?.toLowerCase().includes("color") ||
      opt.name?.toLowerCase().includes("colour"),
  );
  for (const value of colorOption?.values ?? []) {
    const name = typeof value === "string" ? value : value?.name;
    if (name) out.push(name);
  }
  for (const variant of product.variants ?? []) {
    for (const so of variant.selectedOptions ?? []) {
      const n = String(so.name || "").toLowerCase();
      if (!n.includes("color") && !n.includes("colour")) continue;
      if (so.value) out.push(so.value);
    }
  }
  return out;
}

function extractGrapeValues(product: Product): string[] {
  const out = new Set<string>();
  const opt = product.options?.find((o) =>
    o.name?.toLowerCase().includes("grape"),
  );
  for (const v of opt?.values ?? []) {
    const name = typeof v === "string" ? v : v?.name;
    if (name) out.add(String(name).trim());
  }
  for (const variant of product.variants ?? []) {
    for (const so of variant.selectedOptions ?? []) {
      if (!String(so.name || "")
        .toLowerCase()
        .includes("grape"))
        continue;
      const value = String(so.value || "").trim();
      if (value) out.add(value);
    }
  }
  for (const t of product.tags ?? []) {
    const v = String(t || "").trim();
    if (v) out.add(v);
  }
  for (const c of ["red", "white", "orange", "rose", "rosé", "sparkling"]) {
    out.delete(c);
    out.delete(c.charAt(0).toUpperCase() + c.slice(1));
  }
  return Array.from(out).filter(Boolean);
}

type SearchFields = {
  title: string;
  producer: string;
  handle: string;
  grapes: string;
  colors: string;
  farming: string;
  region: string;
  tags: string;
  description: string;
  haystack: string;
};

function buildSearchFields(product: Product): SearchFields {
  const title = foldShopSearchText(product.title ?? "");
  const producer = foldShopSearchText(product.producerName ?? "");
  const handle = foldShopSearchText((product.handle ?? "").replace(/-/g, " "));
  const grapes = foldShopSearchText(extractGrapeValues(product).join(" "));
  const colors = foldShopSearchText(extractColorValues(product).join(" "));
  const farming = foldShopSearchText(
    product.farming ?? product.wineEnrichment?.farming ?? "",
  );
  const region = foldShopSearchText(
    [
      product.producerLocation?.region,
      product.producerLocation?.subregion,
      product.wineEnrichment?.appellation,
      product.specs?.Region,
      product.specs?.Appellation,
    ]
      .filter(Boolean)
      .join(" "),
  );
  const tags = foldShopSearchText(
    [...(product.tags ?? []), ...(product.taste_tags ?? [])].join(" "),
  );
  const description = foldShopSearchText(
    [product.description, product.summary, product.seo?.description]
      .filter(Boolean)
      .join(" "),
  );

  return {
    title,
    producer,
    handle,
    grapes,
    colors,
    farming,
    region,
    tags,
    description,
    haystack: [
      title,
      producer,
      handle,
      grapes,
      colors,
      farming,
      region,
      tags,
      description,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function fieldContains(field: string, needle: string): boolean {
  if (!field || !needle) return false;
  return field.includes(needle);
}

function tokenMatchesHaystack(token: string, haystack: string): boolean {
  const variants = expandToken(token);
  return variants.some((v) => fieldContains(haystack, v));
}

function scopeHaystack(fields: SearchFields, scope: ShopSearchScope): string {
  switch (scope) {
    case "wine":
      return [fields.title, fields.handle].filter(Boolean).join(" ");
    case "producer":
      return fields.producer;
    case "grape":
      return fields.grapes;
    case "all":
    default:
      return fields.haystack;
  }
}

/**
 * Higher is better. Exact/prefix title & producer beats substring & soft fields.
 */
function scoreTokenAgainstFields(
  token: string,
  fields: SearchFields,
  scope: ShopSearchScope,
): number {
  const variants = expandToken(token);
  let best = 0;

  for (const v of variants) {
    if (!v) continue;

    if (scope === "all" || scope === "wine") {
      if (fields.title === v) best = Math.max(best, 100);
      else if (fields.title.startsWith(v + " ") || fields.title.startsWith(v))
        best = Math.max(best, 80);
      else if (fieldContains(fields.title, v)) best = Math.max(best, 55);
      if (fieldContains(fields.handle, v)) best = Math.max(best, 40);
    }

    if (scope === "all" || scope === "producer") {
      if (fields.producer === v) best = Math.max(best, 90);
      else if (
        fields.producer.startsWith(v + " ") ||
        fields.producer.startsWith(v)
      )
        best = Math.max(best, 70);
      else if (fieldContains(fields.producer, v)) best = Math.max(best, 50);
    }

    if (scope === "all" || scope === "grape") {
      if (fieldContains(fields.grapes, v)) best = Math.max(best, 45);
    }

    if (scope === "all") {
      if (fieldContains(fields.colors, v)) best = Math.max(best, 35);
      if (fieldContains(fields.farming, v)) best = Math.max(best, 30);
      if (fieldContains(fields.region, v)) best = Math.max(best, 28);
      if (fieldContains(fields.tags, v)) best = Math.max(best, 22);
      if (fieldContains(fields.description, v)) best = Math.max(best, 12);
    }
  }

  return best;
}

export function scoreProductAgainstSearchQuery(
  product: Product,
  rawQuery: string,
  scope: ShopSearchScope = "all",
): number {
  const tokens = tokenizeShopSearch(rawQuery);
  if (tokens.length === 0) return 0;

  const fields = buildSearchFields(product);
  const haystack = scopeHaystack(fields, scope);

  for (const token of tokens) {
    if (!tokenMatchesHaystack(token, haystack)) return 0;
  }

  let score = 0;
  for (const token of tokens) {
    score += scoreTokenAgainstFields(token, fields, scope);
  }

  const phrase = foldShopSearchText(rawQuery);
  if (phrase.includes(" ")) {
    if (
      (scope === "all" || scope === "wine") &&
      fieldContains(fields.title, phrase)
    ) {
      score += 40;
    }
    if (
      (scope === "all" || scope === "producer") &&
      fieldContains(fields.producer, phrase)
    ) {
      score += 35;
    }
    if (
      (scope === "all" || scope === "grape") &&
      fieldContains(fields.grapes, phrase)
    ) {
      score += 30;
    }
  }

  return score;
}

export function filterAndRankProductsBySearch(
  products: Product[],
  rawQuery: string | null | undefined,
  scope: ShopSearchScope = "all",
): Product[] {
  const q = (rawQuery ?? "").trim();
  if (!q) return products;

  const scored: { product: Product; score: number }[] = [];
  for (const product of products) {
    const score = scoreProductAgainstSearchQuery(product, q, scope);
    if (score > 0) scored.push({ product, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.product.title ?? "").localeCompare(b.product.title ?? "");
  });

  return scored.map((s) => s.product);
}

export type ShopSearchScopeCounts = Record<ShopSearchScope, number>;

/** Counts for facet tabs — same product set, different scopes. */
export function countProductsBySearchScope(
  products: Product[],
  rawQuery: string | null | undefined,
): ShopSearchScopeCounts {
  const counts: ShopSearchScopeCounts = {
    all: 0,
    wine: 0,
    producer: 0,
    grape: 0,
  };
  const q = (rawQuery ?? "").trim();
  if (!q) return counts;

  for (const product of products) {
    for (const scope of SHOP_SEARCH_SCOPES) {
      if (scoreProductAgainstSearchQuery(product, q, scope) > 0) {
        counts[scope] += 1;
      }
    }
  }
  return counts;
}
