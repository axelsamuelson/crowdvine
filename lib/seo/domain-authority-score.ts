/**
 * Internal 0–100 authority proxy (not Moz DA).
 * Weights renormalize when a signal is missing.
 */
export type AuthorityScoreInput = {
  openPageRank: number | null;
  referringDomains: number | null;
  gscImpressions28d: number | null;
  sitemapUrlCount: number | null;
};

export type AuthorityScoreComponents = {
  openPageRank: number | null;
  referringDomains: number | null;
  gscImpressions: number | null;
  sitemapUrls: number | null;
};

const WEIGHTS = {
  openPageRank: 0.4,
  gscImpressions: 0.3,
  sitemapUrls: 0.2,
  referringDomains: 0.1,
} as const;

/** log10 scale capped at 100 — ref ≈ “strong enough for a small brand”. */
function logScale(value: number, ref: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(ref) || ref <= 0) return 0;
  return Math.min(100, (Math.log10(value + 1) / Math.log10(ref + 1)) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeAuthorityScore(input: AuthorityScoreInput): {
  score: number;
  components: AuthorityScoreComponents;
  usedWeights: Partial<Record<keyof typeof WEIGHTS, number>>;
} {
  const components: AuthorityScoreComponents = {
    openPageRank:
      input.openPageRank == null
        ? null
        : round2(Math.min(100, Math.max(0, input.openPageRank) * 10)),
    referringDomains:
      input.referringDomains == null
        ? null
        : round2(logScale(input.referringDomains, 50_000)),
    gscImpressions:
      input.gscImpressions28d == null
        ? null
        : round2(logScale(input.gscImpressions28d, 500_000)),
    sitemapUrls:
      input.sitemapUrlCount == null
        ? null
        : round2(logScale(input.sitemapUrlCount, 5_000)),
  };

  const available: { key: keyof typeof WEIGHTS; value: number; weight: number }[] =
    [];
  if (components.openPageRank != null) {
    available.push({
      key: "openPageRank",
      value: components.openPageRank,
      weight: WEIGHTS.openPageRank,
    });
  }
  if (components.gscImpressions != null) {
    available.push({
      key: "gscImpressions",
      value: components.gscImpressions,
      weight: WEIGHTS.gscImpressions,
    });
  }
  if (components.sitemapUrls != null) {
    available.push({
      key: "sitemapUrls",
      value: components.sitemapUrls,
      weight: WEIGHTS.sitemapUrls,
    });
  }
  if (components.referringDomains != null) {
    available.push({
      key: "referringDomains",
      value: components.referringDomains,
      weight: WEIGHTS.referringDomains,
    });
  }

  if (available.length === 0) {
    return { score: 0, components, usedWeights: {} };
  }

  const weightSum = available.reduce((s, a) => s + a.weight, 0);
  const usedWeights: Partial<Record<keyof typeof WEIGHTS, number>> = {};
  let score = 0;
  for (const a of available) {
    const w = a.weight / weightSum;
    usedWeights[a.key] = round2(w);
    score += a.value * w;
  }

  return { score: round2(score), components, usedWeights };
}
