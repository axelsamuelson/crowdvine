import { SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK } from "@/lib/guides/systembolaget-producer-availability";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CoverageSuggestedCategory =
  | "red"
  | "white"
  | "orange"
  | "sparkling"
  | "rose"
  | null;

export type TopProducerCoverageGap = {
  rank: number;
  listName: string;
  producerName: string;
  productNumber: string;
  nameBold: string | null;
  nameThin: string | null;
  vintage: number | null;
  price: number | null;
  assortmentText: string | null;
  categoryLevel2: string | null;
  suggestedCategory: CoverageSuggestedCategory;
  syncedAt: string | null;
};

/** Map Systembolaget category_level_2 to a curated style guess. */
export function suggestCuratedCategoryFromLevel2(
  categoryLevel2: string | null | undefined,
): CoverageSuggestedCategory {
  if (!categoryLevel2) return null;
  const value = categoryLevel2.toLowerCase();
  if (value.includes("orange")) return "orange";
  if (value.includes("mousserande")) return "sparkling";
  if (value.includes("rosé") || value.includes("rose")) return "rose";
  if (value.includes("rött") || value.includes("rott")) return "red";
  if (value.includes("vitt")) return "white";
  return null;
}

export function mappedProducerNames(): string[] {
  return [
    ...new Set(
      Object.values(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK).flatMap((names) => [
        ...names,
      ]),
    ),
  ];
}

export function ranksForProducerName(producerName: string): number[] {
  return Object.entries(SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK)
    .filter(([, names]) => names.includes(producerName))
    .map(([rank]) => Number(rank))
    .sort((a, b) => a - b);
}

/**
 * Available products for mapped top producers that have no curated row
 * (published or draft). Read-only.
 */
export async function listTopProducerCoverageGaps(): Promise<
  TopProducerCoverageGap[]
> {
  const names = mappedProducerNames();
  if (names.length === 0) return [];

  const sb = getSupabaseAdmin();
  const { data: products, error: productsError } = await sb
    .from("systembolaget_products")
    .select(
      "product_number, producer_name, name_bold, name_thin, vintage, price, assortment_text, category_level_2, synced_at, is_available",
    )
    .in("producer_name", names)
    .eq("is_available", true);

  if (productsError) throw new Error(productsError.message);

  const { data: curated, error: curatedError } = await sb
    .from("systembolaget_curated")
    .select("product_number");

  if (curatedError) throw new Error(curatedError.message);

  const curatedNumbers = new Set(
    (curated ?? []).map((row) => String(row.product_number)),
  );

  const listNameByRank = new Map(
    TOP_100_PRODUCERS.map((producer) => [producer.rank, producer.name]),
  );

  const gaps: TopProducerCoverageGap[] = [];
  for (const product of products ?? []) {
    const productNumber = String(product.product_number);
    if (curatedNumbers.has(productNumber)) continue;
    const producerName = product.producer_name;
    if (!producerName) continue;
    for (const rank of ranksForProducerName(producerName)) {
      gaps.push({
        rank,
        listName: listNameByRank.get(rank) ?? producerName,
        producerName,
        productNumber,
        nameBold: product.name_bold,
        nameThin: product.name_thin,
        vintage: product.vintage,
        price:
          product.price === null || product.price === undefined
            ? null
            : Number(product.price),
        assortmentText: product.assortment_text,
        categoryLevel2: product.category_level_2,
        suggestedCategory: suggestCuratedCategoryFromLevel2(
          product.category_level_2,
        ),
        syncedAt: product.synced_at,
      });
    }
  }

  gaps.sort(
    (a, b) =>
      a.rank - b.rank || a.productNumber.localeCompare(b.productNumber),
  );
  return gaps;
}

/**
 * Proposed top_100_producer_name values for curated rows that still lack one,
 * using only the static producer_name map (no fuzzy match).
 */
export async function listMissingTop100ProducerNameSuggestions(): Promise<
  Array<{
    productNumber: string;
    curatedProducerName: string | null;
    suggestedTop100Name: string;
    rank: number;
  }>
> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_curated")
    .select("product_number, top_100_producer_name")
    .is("top_100_producer_name", null);

  if (error) throw new Error(error.message);

  const productNumbers = [
    ...new Set((data ?? []).map((row) => String(row.product_number))),
  ];
  if (productNumbers.length === 0) return [];

  const { data: products, error: productsError } = await sb
    .from("systembolaget_products")
    .select("product_number, producer_name")
    .in("product_number", productNumbers);

  if (productsError) throw new Error(productsError.message);

  const producerByNumber = new Map(
    (products ?? []).map((row) => [
      String(row.product_number),
      row.producer_name as string | null,
    ]),
  );

  const listNameByRank = new Map(
    TOP_100_PRODUCERS.map((producer) => [producer.rank, producer.name]),
  );

  const suggestions: Array<{
    productNumber: string;
    curatedProducerName: string | null;
    suggestedTop100Name: string;
    rank: number;
  }> = [];

  for (const productNumber of productNumbers) {
    const producerName = producerByNumber.get(productNumber) ?? null;
    if (!producerName) continue;
    const ranks = ranksForProducerName(producerName);
    if (ranks.length !== 1) continue;
    const rank = ranks[0]!;
    const suggested = listNameByRank.get(rank);
    if (!suggested) continue;
    suggestions.push({
      productNumber,
      curatedProducerName: producerName,
      suggestedTop100Name: suggested,
      rank,
    });
  }

  suggestions.sort(
    (a, b) =>
      a.rank - b.rank || a.productNumber.localeCompare(b.productNumber),
  );
  return suggestions;
}
