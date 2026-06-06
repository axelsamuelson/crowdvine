import type { Product } from "@/lib/shopify/types";

/** Why a wine was recommended — extensible for future ML / rules engines. */
export type RecommendationReason = "same_producer" | "similar_profile";

export type PdpRecommendation = {
  product: Product;
  reason: RecommendationReason;
  /** Internal score for similar wines (higher = better match). */
  score?: number;
};

export type PdpRecommendationsResult = {
  sameProducer: PdpRecommendation[];
  similar: PdpRecommendation[];
  /** Interleaved list for a single carousel (producer ↔ similar). */
  items: PdpRecommendation[];
};

export type WineSimilaritySignals = {
  wineId: string;
  handle: string;
  producerId?: string | null;
  color?: string | null;
  grapeVarieties?: string[] | null;
  appellation?: string | null;
  /** List price in SEK (öre / 100). */
  basePriceSek?: number | null;
};

const DEFAULT_MAX_TOTAL = 4;
const DEFAULT_SAME_PRODUCER = 4;
const DEFAULT_SIMILAR = 4;

function normalizeToken(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeColor(value: string | null | undefined): string {
  const c = normalizeToken(value);
  if (c.includes("red") || c.includes("rött") || c.includes("röd")) return "red";
  if (c.includes("white") || c.includes("vitt") || c.includes("vit")) return "white";
  if (c.includes("rosé") || c.includes("rose")) return "rose";
  if (c.includes("orange")) return "orange";
  if (c.includes("sparkling") || c.includes("mousserande")) return "sparkling";
  return c;
}

export function parseGrapeVarieties(
  product: Pick<Product, "tags" | "wineEnrichment">,
): string[] {
  const fromEnrichment = product.wineEnrichment?.grapeVarieties;
  if (Array.isArray(fromEnrichment)) {
    return fromEnrichment.map((g) => normalizeToken(g)).filter(Boolean);
  }
  if (typeof fromEnrichment === "string" && fromEnrichment.trim()) {
    return fromEnrichment
      .split(/[,;/]/)
      .map((g) => normalizeToken(g))
      .filter(Boolean);
  }

  const colorTokens = new Set([
    "red",
    "white",
    "orange",
    "rosé",
    "rose",
    "sparkling",
    "rött",
    "vitt",
    "mousserande",
  ]);
  return (product.tags ?? [])
    .map((t) => normalizeToken(t))
    .filter((t) => t && !colorTokens.has(t));
}

export function extractSimilaritySignals(product: Product): WineSimilaritySignals {
  const basePriceCents = product.priceBreakdown?.basePriceCents;
  const amount = Number(product.priceRange?.minVariantPrice?.amount ?? 0);
  const basePriceSek =
    basePriceCents != null && basePriceCents > 0
      ? basePriceCents / 100
      : Number.isFinite(amount) && amount > 0
        ? amount
        : null;

  return {
    wineId: product.id,
    handle: product.handle,
    producerId: product.producerId,
    color:
      product.wineEnrichment?.color ??
      product.tags?.find((t) =>
        /red|white|orange|rosé|rose|sparkling|rött|vitt/i.test(t),
      ) ??
      null,
    grapeVarieties: parseGrapeVarieties(product),
    appellation: product.wineEnrichment?.appellation ?? null,
    basePriceSek,
  };
}

/**
 * Heuristic similarity score (v1). Replace or augment with embeddings / co-purchase later.
 */
export function scoreWineSimilarity(
  anchor: WineSimilaritySignals,
  candidate: Product,
): number {
  if (candidate.id === anchor.wineId || candidate.handle === anchor.handle) {
    return -1;
  }
  if (
    anchor.producerId &&
    candidate.producerId &&
    candidate.producerId === anchor.producerId
  ) {
    return -1;
  }

  const candidateSignals = extractSimilaritySignals(candidate);
  let score = 0;

  const anchorColor = normalizeColor(anchor.color);
  const candidateColor = normalizeColor(candidateSignals.color);
  if (anchorColor && candidateColor && anchorColor === candidateColor) {
    score += 40;
  }

  const anchorGrapes = new Set(anchor.grapeVarieties ?? []);
  const candidateGrapes = candidateSignals.grapeVarieties ?? [];
  if (anchorGrapes.size > 0 && candidateGrapes.length > 0) {
    let overlap = 0;
    for (const g of candidateGrapes) {
      if (anchorGrapes.has(g)) overlap += 1;
    }
    score += Math.min(30, overlap * 12);
  }

  const anchorApp = normalizeToken(anchor.appellation);
  const candidateApp = normalizeToken(candidateSignals.appellation);
  if (anchorApp && candidateApp && anchorApp === candidateApp) {
    score += 18;
  }

  const anchorPrice = anchor.basePriceSek;
  const candidatePrice = candidateSignals.basePriceSek;
  if (
    anchorPrice != null &&
    candidatePrice != null &&
    anchorPrice > 0 &&
    candidatePrice > 0
  ) {
    const ratio = candidatePrice / anchorPrice;
    if (ratio >= 0.7 && ratio <= 1.35) score += 20;
    else if (ratio >= 0.5 && ratio <= 1.7) score += 8;
  }

  if (candidate.availableForSale) score += 5;
  if (candidate.producerBoostActive) score += 2;

  return score;
}

function interleaveRecommendations(
  sameProducer: PdpRecommendation[],
  similar: PdpRecommendation[],
  maxTotal: number,
): PdpRecommendation[] {
  const items: PdpRecommendation[] = [];
  let pi = 0;
  let si = 0;

  while (items.length < maxTotal && (pi < sameProducer.length || si < similar.length)) {
    if (pi < sameProducer.length) {
      items.push(sameProducer[pi++]);
      if (items.length >= maxTotal) break;
    }
    if (si < similar.length && items.length < maxTotal) {
      items.push(similar[si++]);
    }
  }

  return items;
}

export function buildPdpRecommendations(params: {
  anchor: WineSimilaritySignals;
  sameProducerCandidates: Product[];
  similarCandidates: Product[];
  maxSameProducer?: number;
  maxSimilar?: number;
  maxTotal?: number;
}): PdpRecommendationsResult {
  const maxSameProducer = params.maxSameProducer ?? DEFAULT_SAME_PRODUCER;
  const maxSimilar = params.maxSimilar ?? DEFAULT_SIMILAR;
  const maxTotal = params.maxTotal ?? DEFAULT_MAX_TOTAL;

  const sameProducer = params.sameProducerCandidates
    .filter(
      (p) =>
        p.id !== params.anchor.wineId &&
        p.handle !== params.anchor.handle &&
        p.productType === "wine",
    )
    .slice(0, maxSameProducer)
    .map((product) => ({
      product,
      reason: "same_producer" as const,
    }));

  const scoredSimilar = params.similarCandidates
    .map((product) => ({
      product,
      score: scoreWineSimilarity(params.anchor, product),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const similar = scoredSimilar.slice(0, maxSimilar).map((row) => ({
    product: row.product,
    reason: "similar_profile" as const,
    score: row.score,
  }));

  return {
    sameProducer,
    similar,
    items: interleaveRecommendations(sameProducer, similar, maxTotal),
  };
}
