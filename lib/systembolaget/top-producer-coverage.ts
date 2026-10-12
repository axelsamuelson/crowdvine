import {
  NESTAREC_SYSTEMBOLAGET_PRODUCER_NAMES,
  SYSTEMBOLAGET_PRODUCER_NAMES_BY_RANK,
  syncProducerNameUnionList,
} from "@/lib/guides/systembolaget-producer-availability";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SB_API_BASE =
  "https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search";
const SB_SUBSCRIPTION_KEY = "cfc702aed3094c86b92d6d4ff7a54c84";
const PAGE_SIZE = 30;
const MAX_PAGES = 50;

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

export type MissingInMirrorProduct = {
  productNumber: string;
  nameBold: string | null;
  nameThin: string | null;
  vintage: number | null;
  price: number | null;
  assortmentText: string | null;
  categoryLevel2: string | null;
  country: string | null;
};

export type MissingInMirrorByProducer = {
  producerName: string;
  missing_in_mirror: MissingInMirrorProduct[];
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

/** Mix boxes / mixed packs: not single bottles for curation gaps. */
export function isMixBoxProduct(input: {
  categoryLevel2?: string | null;
  nameBold?: string | null;
  nameThin?: string | null;
}): boolean {
  const level2 = (input.categoryLevel2 ?? "").toLowerCase();
  if (level2.includes("vinlåda") || level2.includes("presentförpackning")) {
    return true;
  }
  const title = `${input.nameBold ?? ""} ${input.nameThin ?? ""}`.toLowerCase();
  if (
    title.includes("vinstereo") ||
    title.includes("mixtape") ||
    title.includes("mixpack") ||
    title.includes("mix box")
  ) {
    return true;
  }
  return false;
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

type ApiWineHit = {
  productNumber: string;
  nameBold: string | null;
  nameThin: string | null;
  vintage: number | null;
  price: number | null;
  assortmentText: string | null;
  categoryLevel2: string | null;
  country: string | null;
  producerName: string | null;
};

async function fetchApiWinesForProducer(
  producerName: string,
): Promise<ApiWineHit[]> {
  const query = `textQuery=${encodeURIComponent(producerName)}`;
  const hits: ApiWineHit[] = [];
  let page = 1;
  for (let pages = 0; pages < MAX_PAGES; pages += 1) {
    const url = `${SB_API_BASE}?${query}&size=${PAGE_SIZE}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "ocp-apim-subscription-key": SB_SUBSCRIPTION_KEY,
        Referer: "https://www.systembolaget.se/",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(
        `Coverage API HTTP ${res.status} for producer ${producerName}`,
      );
    }
    const json = (await res.json()) as {
      metadata?: { nextPage?: number };
      products?: Array<Record<string, unknown>>;
    };
    for (const item of json.products ?? []) {
      if (item.categoryLevel1 !== "Vin") continue;
      if (item.producerName !== producerName) continue;
      const productNumber = String(item.productNumber ?? "");
      if (!productNumber) continue;
      const vintageRaw = item.vintage;
      let vintage: number | null = null;
      if (vintageRaw !== null && vintageRaw !== undefined && vintageRaw !== "") {
        const n =
          typeof vintageRaw === "number"
            ? vintageRaw
            : Number.parseInt(String(vintageRaw), 10);
        if (Number.isFinite(n) && n > 0) vintage = Math.trunc(n);
      }
      hits.push({
        productNumber,
        nameBold: typeof item.productNameBold === "string" ? item.productNameBold : null,
        nameThin: typeof item.productNameThin === "string" ? item.productNameThin : null,
        vintage,
        price: typeof item.price === "number" ? item.price : null,
        assortmentText:
          typeof item.assortmentText === "string" ? item.assortmentText : null,
        categoryLevel2:
          typeof item.categoryLevel2 === "string" ? item.categoryLevel2 : null,
        country: typeof item.country === "string" ? item.country : null,
        producerName:
          typeof item.producerName === "string" ? item.producerName : null,
      });
    }
    const next = json.metadata?.nextPage;
    if (next == null || next === -1) break;
    page = next;
  }
  return hits;
}

/**
 * Available products for mapped top producers that have no curated row
 * and no product review. Excludes mix boxes. Also reports API wines missing
 * from the mirror per mapped producer_name.
 */
export async function listTopProducerCoverageGaps(): Promise<{
  gaps: TopProducerCoverageGap[];
  missingInMirrorByProducer: MissingInMirrorByProducer[];
  missingInMirrorCount: number;
}> {
  const names = mappedProducerNames();
  if (names.length === 0) {
    return { gaps: [], missingInMirrorByProducer: [], missingInMirrorCount: 0 };
  }

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

  const { data: reviews, error: reviewsError } = await sb
    .from("systembolaget_product_reviews")
    .select("product_number");

  if (reviewsError) throw new Error(reviewsError.message);

  const curatedNumbers = new Set(
    (curated ?? []).map((row) => String(row.product_number)),
  );
  const reviewedNumbers = new Set(
    (reviews ?? []).map((row) => String(row.product_number)),
  );

  const listNameByRank = new Map(
    TOP_100_PRODUCERS.map((producer) => [producer.rank, producer.name]),
  );

  const gaps: TopProducerCoverageGap[] = [];
  for (const product of products ?? []) {
    const productNumber = String(product.product_number);
    if (curatedNumbers.has(productNumber)) continue;
    if (reviewedNumbers.has(productNumber)) continue;
    if (
      isMixBoxProduct({
        categoryLevel2: product.category_level_2,
        nameBold: product.name_bold,
        nameThin: product.name_thin,
      })
    ) {
      continue;
    }
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

  const mirrorNames = syncProducerNameUnionList();
  const { data: mirrorRows, error: mirrorError } = await sb
    .from("systembolaget_products")
    .select("product_number, producer_name")
    .in("producer_name", mirrorNames);
  if (mirrorError) throw new Error(mirrorError.message);

  const mirrorByProducer = new Map<string, Set<string>>();
  for (const row of mirrorRows ?? []) {
    const producerName = row.producer_name as string | null;
    if (!producerName) continue;
    const set = mirrorByProducer.get(producerName) ?? new Set<string>();
    set.add(String(row.product_number));
    mirrorByProducer.set(producerName, set);
  }

  const missingInMirrorByProducer: MissingInMirrorByProducer[] = [];
  let missingInMirrorCount = 0;
  for (const producerName of mirrorNames) {
    const apiHits = await fetchApiWinesForProducer(producerName);
    const mirrored = mirrorByProducer.get(producerName) ?? new Set<string>();
    const missing: MissingInMirrorProduct[] = [];
    for (const hit of apiHits) {
      if (mirrored.has(hit.productNumber)) continue;
      if (
        isMixBoxProduct({
          categoryLevel2: hit.categoryLevel2,
          nameBold: hit.nameBold,
          nameThin: hit.nameThin,
        })
      ) {
        continue;
      }
      missing.push({
        productNumber: hit.productNumber,
        nameBold: hit.nameBold,
        nameThin: hit.nameThin,
        vintage: hit.vintage,
        price: hit.price,
        assortmentText: hit.assortmentText,
        categoryLevel2: hit.categoryLevel2,
        country: hit.country,
      });
    }
    missingInMirrorCount += missing.length;
    missingInMirrorByProducer.push({
      producerName,
      missing_in_mirror: missing,
    });
  }

  return { gaps, missingInMirrorByProducer, missingInMirrorCount };
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

/** Nestarec names kept exported for tests / callers. */
export { NESTAREC_SYSTEMBOLAGET_PRODUCER_NAMES };
