import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";

export const PRODUCER_WEIGHT = 0.35;
export const WINE_WEIGHT = 0.65;

export const DEFAULT_MIX = {
  minGap: 1,
  topN: 5,
  topCap: 2,
} as const;

export type MixOptions = {
  minGap: number;
  topN: number;
  topCap: number;
};

const PRODUCER_RANK_BY_NAME = new Map(
  TOP_100_PRODUCERS.map((producer) => [producer.name, producer.rank]),
);

export type RankingSource = {
  productNumber: string;
  name: string;
  category: string;
  verdict: string;
  isPublished: boolean;
  wineScore: number | null;
  scoreAdjust: number;
  sortOrder: number;
  top100ProducerName: string | null;
  producerName: string | null;
  country: string | null;
};

export type RankedCuratedWine = RankingSource & {
  producerKey: string;
  producerRank: number | null;
  producerPoints: number;
  score: number | null;
  /** Pure score position in the global deduped list. Null when wine_score is null. */
  scoreRank: number | null;
  categoryRank: number;
  countryRank: number;
  globalRank: number;
  /** True when the mix rule changed this wine's place in at least one view. */
  moved: boolean;
};

type Scored<T> = T & {
  productNumber: string;
  producerKey: string;
  score: number;
  sortOrder: number;
};

/** Top 100 name matches on the exact list name. Everyone else scores 30. */
export function producerScore(rank: number | null | undefined): number {
  if (rank == null || !Number.isFinite(rank)) return 30;
  return Math.max(30, 100 - 0.6 * (rank - 1));
}

export function producerRankForName(
  top100ProducerName: string | null | undefined,
): number | null {
  const name = top100ProducerName?.trim();
  if (!name) return null;
  return PRODUCER_RANK_BY_NAME.get(name) ?? null;
}

export function producerKeyFrom(input: {
  top100ProducerName?: string | null;
  producerName?: string | null;
  productNumber: string;
}): string {
  const top = input.top100ProducerName?.trim();
  if (top) return top;
  const producer = input.producerName?.trim();
  if (producer) return producer;
  return input.productNumber;
}

export function blendScore(
  producerPoints: number,
  wineScore: number,
  scoreAdjust: number,
): number {
  return PRODUCER_WEIGHT * producerPoints + WINE_WEIGHT * wineScore + scoreAdjust;
}

function compareScore(
  a: { score: number; sortOrder: number; productNumber: string },
  b: { score: number; sortOrder: number; productNumber: string },
): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.productNumber.localeCompare(b.productNumber);
}

function compareSortOrder(
  a: { sortOrder: number; productNumber: string },
  b: { sortOrder: number; productNumber: string },
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.productNumber.localeCompare(b.productNumber);
}

function isMixAllowed<T extends { producerKey: string }>(
  candidate: T,
  placed: readonly T[],
  options: MixOptions,
): boolean {
  const gap = Math.max(0, options.minGap);
  const recent = placed.slice(Math.max(0, placed.length - gap));
  if (recent.some((item) => item.producerKey === candidate.producerKey)) {
    return false;
  }
  if (placed.length < options.topN) {
    const already = placed.filter(
      (item) => item.producerKey === candidate.producerKey,
    ).length;
    if (already >= options.topCap) return false;
  }
  return true;
}

/**
 * Highest score first, then skip a producer that sits on the previous
 * position or already fills the cap inside the top positions.
 * If every remaining wine is blocked, the highest one is taken.
 * Every input wine is returned.
 */
export function mixRanking<T extends Scored<unknown>>(
  items: readonly T[],
  options: MixOptions = DEFAULT_MIX,
): T[] {
  const remaining = [...items].sort(compareScore);
  const placed: T[] = [];
  while (remaining.length > 0) {
    let pick = remaining.findIndex((item) =>
      isMixAllowed(item, placed, options),
    );
    if (pick < 0) pick = 0;
    const [next] = remaining.splice(pick, 1);
    placed.push(next);
  }
  return placed;
}

function positionMap<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Map<string, number> {
  const ranks = new Map<string, number>();
  items.forEach((item, index) => {
    ranks.set(keyFn(item), index + 1);
  });
  return ranks;
}

type Measured = RankingSource & {
  producerKey: string;
  producerRank: number | null;
  producerPoints: number;
  score: number | null;
  sortOrder: number;
  productNumber: string;
};

function measure(source: RankingSource): Measured {
  const producerRank = producerRankForName(source.top100ProducerName);
  const producerPoints = producerScore(producerRank);
  const score =
    source.wineScore == null
      ? null
      : blendScore(producerPoints, source.wineScore, source.scoreAdjust);
  return {
    ...source,
    producerKey: producerKeyFrom(source),
    producerRank,
    producerPoints,
    score,
    sortOrder: source.sortOrder,
    productNumber: source.productNumber,
  };
}

function eligible(rows: readonly RankingSource[]): Measured[] {
  return rows
    .filter((row) => row.verdict === "recommended" && row.isPublished)
    .map(measure);
}

function splitScore<T extends { score: number | null; sortOrder: number; productNumber: string }>(
  items: readonly T[],
): { scored: T[]; unscored: T[] } {
  const scored = items.filter((item) => item.score != null);
  const unscored = items
    .filter((item) => item.score == null)
    .slice()
    .sort(compareSortOrder);
  return { scored, unscored };
}

function mixedList<T extends Measured>(items: readonly T[]): T[] {
  const { scored, unscored } = splitScore(items);
  const mixed = mixRanking(
    scored as Array<T & { score: number }>,
  );
  return [...mixed, ...unscored];
}

function pureList<T extends Measured>(items: readonly T[]): T[] {
  const { scored, unscored } = splitScore(items);
  const ordered = (scored as Array<T & { score: number }>).slice().sort(compareScore);
  return [...ordered, ...unscored];
}

function preferRow(current: Measured, candidate: Measured): Measured {
  if (current.score != null && candidate.score == null) return current;
  if (current.score == null && candidate.score != null) return candidate;
  if (
    current.score != null &&
    candidate.score != null &&
    current.score !== candidate.score
  ) {
    return current.score > candidate.score ? current : candidate;
  }
  if (current.sortOrder !== candidate.sortOrder) {
    return current.sortOrder < candidate.sortOrder ? current : candidate;
  }
  if (current.category !== candidate.category) {
    return current.category < candidate.category ? current : candidate;
  }
  return current;
}

/** One row per product_number for country and global lists. */
export function dedupeByProductNumber<T extends Measured>(
  rows: readonly T[],
): T[] {
  const kept = new Map<string, T>();
  for (const row of rows) {
    const existing = kept.get(row.productNumber);
    kept.set(
      row.productNumber,
      existing ? preferRow(existing, row) : row,
    );
  }
  return [...kept.values()];
}

/**
 * Ranks every published recommended row.
 * Country and global lists collapse duplicate product numbers.
 * Avoid rows are left out.
 */
export function buildCuratedRanking(
  rows: readonly RankingSource[],
): RankedCuratedWine[] {
  const measured = eligible(rows);
  const categoryRanks = new Map<string, number>();
  const categoryPure = new Map<string, number>();
  const byCategory = new Map<string, Measured[]>();
  for (const row of measured) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }
  for (const [category, list] of byCategory) {
    const pure = positionMap(pureList(list), (row) => row.productNumber);
    const mixed = positionMap(mixedList(list), (row) => row.productNumber);
    for (const row of list) {
      const key = `${category}:${row.productNumber}`;
      categoryPure.set(key, pure.get(row.productNumber) ?? list.length);
      categoryRanks.set(key, mixed.get(row.productNumber) ?? list.length);
    }
  }

  const deduped = dedupeByProductNumber(measured);
  const countryRanks = new Map<string, number>();
  const countryPure = new Map<string, number>();
  const byCountry = new Map<string, Measured[]>();
  for (const row of deduped) {
    const country = row.country?.trim() || "";
    const list = byCountry.get(country) ?? [];
    list.push(row);
    byCountry.set(country, list);
  }
  for (const [country, list] of byCountry) {
    const pure = positionMap(pureList(list), (row) => row.productNumber);
    const mixed = positionMap(mixedList(list), (row) => row.productNumber);
    for (const row of list) {
      const key = `${country}:${row.productNumber}`;
      countryPure.set(key, pure.get(row.productNumber) ?? list.length);
      countryRanks.set(key, mixed.get(row.productNumber) ?? list.length);
    }
  }

  const globalPure = positionMap(pureList(deduped), (row) => row.productNumber);
  const globalMixed = positionMap(mixedList(deduped), (row) => row.productNumber);

  return measured
    .map((row) => {
      const categoryKey = `${row.category}:${row.productNumber}`;
      const countryKey = `${row.country?.trim() || ""}:${row.productNumber}`;
      const categoryRank = categoryRanks.get(categoryKey) ?? 0;
      const countryRank = countryRanks.get(countryKey) ?? 0;
      const globalRank = globalMixed.get(row.productNumber) ?? 0;
      const pureCategory = categoryPure.get(categoryKey) ?? categoryRank;
      const pureCountry = countryPure.get(countryKey) ?? countryRank;
      const pureGlobal = globalPure.get(row.productNumber) ?? globalRank;
      const scoreRank = row.score == null ? null : pureGlobal;
      const moved =
        categoryRank !== pureCategory ||
        countryRank !== pureCountry ||
        globalRank !== pureGlobal;
      return {
        ...row,
        scoreRank,
        categoryRank,
        countryRank,
        globalRank,
        moved,
      };
    })
    .sort((a, b) => a.globalRank - b.globalRank || a.category.localeCompare(b.category));
}

export type RankingView = "category" | "country" | "global";

export function rankingForView(
  ranked: readonly RankedCuratedWine[],
  view: RankingView,
  filter?: { category?: string; country?: string },
): Array<
  RankedCuratedWine & {
    viewScoreRank: number | null;
    viewRank: number;
    viewMoved: boolean;
  }
> {
  if (view === "category") {
    const category = filter?.category;
    const rows = ranked.filter((row) => row.category === category);
    return annotateView(rows, (row) => row.categoryRank);
  }
  const deduped = dedupeByProductNumber(ranked);
  if (view === "country") {
    const country = filter?.country?.trim() || "";
    const rows = deduped.filter(
      (row) => (row.country?.trim() || "") === country,
    );
    return annotateView(rows, (row) => row.countryRank);
  }
  return annotateView(deduped, (row) => row.globalRank);
}

function annotateView(
  rows: readonly RankedCuratedWine[],
  mixedRank: (row: RankedCuratedWine) => number,
): Array<
  RankedCuratedWine & {
    viewScoreRank: number | null;
    viewRank: number;
    viewMoved: boolean;
  }
> {
  const pure = pureList(rows);
  const pureRank = positionMap(pure, (row) =>
    `${row.category}:${row.productNumber}`,
  );
  return [...rows]
    .sort((a, b) => mixedRank(a) - mixedRank(b))
    .map((row) => {
      const viewScoreRank =
        row.score == null
          ? null
          : (pureRank.get(`${row.category}:${row.productNumber}`) ?? null);
      const viewRank = mixedRank(row);
      return {
        ...row,
        viewScoreRank,
        viewRank,
        viewMoved: viewScoreRank != null && viewScoreRank !== viewRank,
      };
    });
}

type GuideOrderWine = {
  product_number: string;
  wine_score?: number | null;
  score_adjust?: number | null;
  sort_order: number;
  top_100_producer_name?: string | null;
  producer_name?: string | null;
};

/**
 * Order a category list by categoryRank.
 * When no wine has wine_score, the incoming order is kept.
 */
export function orderCategoryWines<T extends GuideOrderWine>(
  wines: readonly T[],
): T[] {
  if (!wines.some((wine) => wine.wine_score != null)) return [...wines];
  const sources: RankingSource[] = wines.map((wine) => ({
    productNumber: wine.product_number,
    name: wine.product_number,
    category: "category",
    verdict: "recommended",
    isPublished: true,
    wineScore: wine.wine_score ?? null,
    scoreAdjust: wine.score_adjust ?? 0,
    sortOrder: wine.sort_order,
    top100ProducerName: wine.top_100_producer_name ?? null,
    producerName: wine.producer_name ?? null,
    country: null,
  }));
  const ranked = buildCuratedRanking(sources);
  const byNumber = new Map(wines.map((wine) => [wine.product_number, wine]));
  return ranked
    .slice()
    .sort((a, b) => a.categoryRank - b.categoryRank)
    .map((row) => byNumber.get(row.productNumber))
    .filter((wine): wine is T => wine != null);
}
