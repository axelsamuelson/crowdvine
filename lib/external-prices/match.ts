/**
 * Score match between our wine and a PDP title (and optional vendor/size).
 * Returns confidence 0-1. Vintage is not used in the score. Reject rules: size mismatch when both present.
 */

import {
  extractVintage,
  extractSize,
  normalizePdpTitle,
  normalizeProducer,
  normalizeWineName,
} from "./normalize";
import type { NormalizedOffer, WineForMatch } from "./types";

const DEFAULT_THRESHOLD = 0.35;

/**
 * Simple string similarity: Jaccard-like token overlap ratio.
 * Tokens are words (split on non-alphanumeric).
 */
function tokenSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const toTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
  const setA = new Set(toTokens(a));
  const setB = new Set(toTokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Substring containment: how much of the shorter string is contained in the longer.
 * Returns 0-1.
 */
function containmentScore(needle: string, haystack: string): number {
  if (!needle) return 0;
  const n = needle.trim().toLowerCase();
  const h = haystack.trim().toLowerCase();
  if (!h) return 0;
  return h.includes(n) ? Math.min(1, n.length / h.length) : 0;
}

/**
 * Compute match confidence between our wine and PDP title.
 * Uses: producer presence, wine name similarity. Vintage is not included.
 */
export function scoreMatch(
  wine: WineForMatch,
  pdpTitleRaw: string,
  options: { threshold?: number } = {}
): number {
  const producerNorm = normalizeProducer(wine.producer?.name);
  const wineNameNorm = normalizeWineName(wine.wine_name);
  const pdpNorm = normalizePdpTitle(pdpTitleRaw);

  let score = 0;
  let weightSum = 0;

  // 1) Producer: if we have it, check containment in PDP title (weight 0.35)
  if (producerNorm) {
    weightSum += 0.35;
    const contain = containmentScore(producerNorm, pdpNorm);
    const sim = tokenSimilarity(producerNorm, pdpNorm);
    score += 0.35 * Math.max(contain, sim);
  }

  // 2) Wine name similarity (weight 0.45)
  if (wineNameNorm) {
    weightSum += 0.45;
    const sim = tokenSimilarity(wineNameNorm, pdpNorm);
    const contain = containmentScore(wineNameNorm, pdpNorm);
    score += 0.45 * Math.max(sim, contain * 1.2); // slight boost for containment
  }

  const totalWeight = weightSum || 1;
  const confidence = score / totalWeight;
  return Math.min(1, Math.round(confidence * 100) / 100);
}

export interface MatchBreakdown {
  producerScore: number;
  wineNameScore: number;
  vintageScore: number;
  vintageOur: string | null;
  vintagePdp: string | null;
  sizeOur: string | null;
  sizePdp: string | null;
}

export function scoreMatchWithBreakdown(
  wine: WineForMatch,
  pdpTitleRaw: string,
  options: { vendor?: string | null; size?: string | null } = {}
): { score: number; breakdown: MatchBreakdown } {
  const producerNorm = normalizeProducer(wine.producer?.name);
  const pdpVendorNorm = normalizeProducer(options.vendor);
  const wineNameNorm = normalizeWineName(wine.wine_name);
  const vintage = wine.vintage?.trim() || "";
  const pdpNorm = normalizePdpTitle(pdpTitleRaw);
  const pdpVintage = extractVintage(pdpTitleRaw) || extractVintage(pdpNorm);
  const ourSize = extractSize(wine.wine_name) || null;
  const pdpSize = options.size ? extractSize(options.size) : extractSize(pdpTitleRaw);

  let producerScore = 0;
  const producerTarget = producerNorm || pdpVendorNorm;
  if (producerTarget) {
    const contain = containmentScore(producerNorm || "", pdpNorm) || containmentScore(pdpVendorNorm, pdpNorm);
    const sim = tokenSimilarity(producerNorm || "", pdpNorm) || tokenSimilarity(pdpVendorNorm, pdpNorm);
    producerScore = Math.max(contain, sim);
  }

  let wineNameScore = 0;
  if (wineNameNorm) {
    const sim = tokenSimilarity(wineNameNorm, pdpNorm);
    const contain = containmentScore(wineNameNorm, pdpNorm);
    wineNameScore = Math.max(sim, contain * 1.2);
  }

  const weightSum = (producerNorm || pdpVendorNorm ? 0.35 : 0) + (wineNameNorm ? 0.45 : 0);
  const score = (producerScore * 0.35 + wineNameScore * 0.45) / (weightSum || 1);

  return {
    score: Math.min(1, Math.round(score * 100) / 100),
    breakdown: {
      producerScore,
      wineNameScore,
      vintageScore: 0,
      vintageOur: vintage || null,
      vintagePdp: pdpVintage || null,
      sizeOur: ourSize,
      sizePdp: pdpSize,
    },
  };
}

export interface EvaluateMatchResult {
  accepted: boolean;
  score: number;
  breakdown: MatchBreakdown;
  rejectReason: string | null;
}

/** Evaluate match with reject rules (size mismatch). Vintage is not used in score. Threshold from options or source config. */
export function evaluateMatch(
  wine: WineForMatch,
  offer: NormalizedOffer,
  options: { threshold?: number } = {}
): EvaluateMatchResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const title = offer.titleRaw || "";
  const { score, breakdown } = scoreMatchWithBreakdown(wine, title, {
    vendor: offer.vendor ?? undefined,
    size: offer.size ?? undefined,
  });

  if (breakdown.sizeOur && breakdown.sizePdp && breakdown.sizeOur !== breakdown.sizePdp) {
    return { accepted: false, score, breakdown, rejectReason: "size_mismatch" };
  }
  if (score < threshold) {
    return { accepted: false, score, breakdown, rejectReason: "below_threshold" };
  }
  return { accepted: true, score, breakdown, rejectReason: null };
}

export function isAboveThreshold(
  wine: WineForMatch,
  pdpTitleRaw: string,
  threshold: number = DEFAULT_THRESHOLD
): boolean {
  return scoreMatch(wine, pdpTitleRaw, { threshold }) >= threshold;
}

export { DEFAULT_THRESHOLD as MATCH_THRESHOLD };
