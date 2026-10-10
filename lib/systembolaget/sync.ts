import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { alertSystembolagetPartitionCap } from "@/lib/systembolaget/sync-alert";

const SB_API_BASE =
  "https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search";

const SB_SUBSCRIPTION_KEY = "cfc702aed3094c86b92d6d4ff7a54c84";

const PAGE_SIZE = 30;
const MAX_PAGES_PER_FILTER = 500;
const INSERT_CHUNK_SIZE = 500;
/**
 * Measured post-fetch work (direct fetch + staging + promote + raw backfill)
 * is about 55s. Route maxDuration is 300s. Abort the fetch phase at 220s so
 * the remaining budget covers that work with a small safety margin:
 * 300_000 - 55_000 - 25_000 = 220_000.
 */
const MEASURED_POST_FETCH_BUDGET_MS = 55_000;
const ROUTE_MAX_DURATION_MS = 300_000;
const FETCH_TIMEOUT_GUARD_MS =
  ROUTE_MAX_DURATION_MS - MEASURED_POST_FETCH_BUDGET_MS - 25_000;
const FETCH_RETRIES = 2;
const DIRECT_FETCH_CONCURRENCY = 8;
const COUNTRY_WALK_CONCURRENCY = 6;
/**
 * Systembolaget caps a search at 333 pages (333 × 30 = 9,990 hits) and then
 * sets nextPage to -1. Page 334 repeats page 333 even when docCount is higher.
 * Split on price before a query reaches that wall.
 */
/** Alert + price-split when any Ordervaror partition's API docCount exceeds this. */
export const ORDERVAROR_PARTITION_CAP = 9_000;
const API_RESULT_WINDOW = ORDERVAROR_PARTITION_CAP;
const MAX_PRICE_SPLITS = 6;
/** Refuse a cron promote when staging is more than 5% smaller than the live table. */
const SHRINK_LIMIT_PER_MILLE = 50;

/** Assortment filter query suffixes (already URL-encoded where needed). */
export const ASSORTMENT_FILTERS = [
  { key: "Fast sortiment", query: "assortmentText=Fast%20sortiment" },
  {
    key: "Tillfälligt sortiment",
    query: "assortmentText=Tillf%C3%A4lligt%20sortiment",
  },
  {
    key: "Ordervaror ≤250",
    query: "assortmentText=Ordervaror&price.max=250",
  },
  // A single price.min=251 query reports ~10,017 hits. The API only walks
  // 333 pages (9,990 hits) and then repeats the last page, so this side is
  // split into bands that each stay under that window.
  {
    key: "Ordervaror 251–500",
    query: "assortmentText=Ordervaror&price.min=251&price.max=500",
  },
  {
    key: "Ordervaror 501–800",
    query: "assortmentText=Ordervaror&price.min=501&price.max=800",
  },
  {
    key: "Ordervaror ≥801",
    query: "assortmentText=Ordervaror&price.min=801",
  },
  { key: "Webblanseringar", query: "assortmentText=Webblanseringar" },
  {
    key: "Lokalt & Småskaligt",
    query: "assortmentText=Lokalt%20%26%20Sm%C3%A5skaligt",
  },
  { key: "Säsong", query: "assortmentText=S%C3%A4song" },
] as const;

/**
 * Ordervaror partitioned by country. Price-band walks miss bottles that a
 * country slice still returns (browse hole). These stay under the 9,990-hit
 * API window; union with the price-band Ordervaror filters.
 */
export const ORDERVAROR_COUNTRIES = [
  "Frankrike",
  "Italien",
  "Spanien",
  "Storbritannien",
  "Sverige",
  "Tyskland",
  "USA",
  "Sydafrika",
  "Portugal",
  "Österrike",
  "Australien",
  "Japan",
  "Mexiko",
  "Belgien",
  "Nederländerna",
  "Grekland",
  "Chile",
  "Danmark",
  "Nya Zeeland",
  "Argentina",
  "Tjeckien",
  "Georgien",
  "Ungern",
  "Kanada",
  "Schweiz",
  "Cypern",
  "Libanon",
  "Serbien",
  "Slovenien",
  "Nordmakedonien",
  "Brasilien",
  "Armenien",
  "Israel",
  "Rumänien",
  "Kroatien",
  "Moldavien",
  "Turkiet",
  "Slovakien",
  "Peru",
  "Bulgarien",
  "Uruguay",
  "Luxemburg",
  "Marocko",
] as const;

export function ordervarorCountryQuery(country: string): string {
  return `assortmentText=Ordervaror&country=${encodeURIComponent(country)}`;
}

/** Fetch-phase abort deadline in ms (220s). Exported for tests/reporting. */
export const FETCH_TIMEOUT_MS = FETCH_TIMEOUT_GUARD_MS;

export type OrdervarorPartitionStat = {
  key: string;
  apiDocCount: number;
};

/** True for Ordervaror price-band and Ordervaror · country walk keys. */
export function isOrdervarorPartitionKey(key: string): boolean {
  return key.startsWith("Ordervaror");
}

export function largestOrdervarorPartition(
  partitions: OrdervarorPartitionStat[],
): OrdervarorPartitionStat | null {
  let best: OrdervarorPartitionStat | null = null;
  for (const p of partitions) {
    if (!best || p.apiDocCount > best.apiDocCount) best = p;
  }
  return best;
}

const SbImageSchema = z
  .object({
    imageUrl: z.string().optional().nullable(),
  })
  .passthrough();

const SbProductSchema = z
  .object({
    productNumber: z.union([z.string(), z.number()]).transform(String),
    productId: z.union([z.string(), z.number()]).optional().nullable(),
    productNameBold: z.string().optional().nullable(),
    productNameThin: z.string().optional().nullable(),
    producerName: z.string().optional().nullable(),
    supplierName: z.string().optional().nullable(),
    categoryLevel1: z.string().optional().nullable(),
    categoryLevel2: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    originLevel1: z.string().optional().nullable(),
    originLevel2: z.string().optional().nullable(),
    vintage: z.union([z.string(), z.number()]).optional().nullable(),
    price: z.number().optional().nullable(),
    volume: z.number().optional().nullable(),
    alcoholPercentage: z.number().optional().nullable(),
    grapes: z.array(z.string()).optional().nullable(),
    assortment: z.string().optional().nullable(),
    assortmentText: z.string().optional().nullable(),
    isOrganic: z.boolean().optional().nullable(),
    isSustainableChoice: z.boolean().optional().nullable(),
    isDiscontinued: z.boolean().optional().nullable(),
    isCompletelyOutOfStock: z.boolean().optional().nullable(),
    isTemporaryOutOfStock: z.boolean().optional().nullable(),
    isSupplierTemporaryNotAvailable: z.boolean().optional().nullable(),
    productLaunchDate: z.string().optional().nullable(),
    images: z.array(SbImageSchema).optional().nullable(),
  })
  .passthrough();

const SbSearchResponseSchema = z
  .object({
    metadata: z
      .object({
        nextPage: z.number(),
        docCount: z.number().optional(),
        totalPages: z.number().optional(),
        priceRange: z
          .object({
            min: z.number().nullable().optional(),
            max: z.number().nullable().optional(),
          })
          .passthrough()
          .nullable()
          .optional(),
      })
      .passthrough(),
    products: z.array(z.unknown()),
  })
  .passthrough();

export type SystembolagetProductRow = {
  product_number: string;
  product_id: string | null;
  name_bold: string | null;
  name_thin: string | null;
  producer_name: string | null;
  supplier_name: string | null;
  category_level_1: string | null;
  category_level_2: string | null;
  country: string | null;
  origin_level_1: string | null;
  origin_level_2: string | null;
  vintage: number | null;
  price: number | null;
  volume: number | null;
  alcohol_percentage: number | null;
  grapes: string[] | null;
  assortment: string | null;
  assortment_text: string | null;
  is_organic: boolean;
  is_sustainable: boolean;
  is_discontinued: boolean;
  is_completely_out_of_stock: boolean;
  is_temporary_out_of_stock: boolean;
  is_supplier_temporary_not_available: boolean;
  product_launch_date: string | null;
  image_url: string | null;
  raw: Record<string, unknown>;
  synced_at: string;
  /** availableNumberOfStores from the product page; null until enriched. */
  store_count: number | null;
};

function parseVintage(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function mapProduct(
  raw: z.infer<typeof SbProductSchema>,
  syncedAt: string,
): SystembolagetProductRow {
  const imageUrl = raw.images?.[0]?.imageUrl ?? null;
  return {
    product_number: raw.productNumber,
    product_id:
      raw.productId === null || raw.productId === undefined
        ? null
        : String(raw.productId),
    name_bold: raw.productNameBold ?? null,
    name_thin: raw.productNameThin ?? null,
    producer_name: raw.producerName ?? null,
    supplier_name: raw.supplierName ?? null,
    category_level_1: raw.categoryLevel1 ?? null,
    category_level_2: raw.categoryLevel2 ?? null,
    country: raw.country ?? null,
    origin_level_1: raw.originLevel1 ?? null,
    origin_level_2: raw.originLevel2 ?? null,
    vintage: parseVintage(raw.vintage),
    price: raw.price ?? null,
    volume:
      raw.volume === null || raw.volume === undefined
        ? null
        : Math.round(raw.volume),
    alcohol_percentage: raw.alcoholPercentage ?? null,
    grapes: raw.grapes ?? null,
    assortment: raw.assortment ?? null,
    assortment_text: raw.assortmentText ?? null,
    is_organic: Boolean(raw.isOrganic),
    is_sustainable: Boolean(raw.isSustainableChoice),
    is_discontinued: Boolean(raw.isDiscontinued),
    is_completely_out_of_stock: Boolean(raw.isCompletelyOutOfStock),
    is_temporary_out_of_stock: Boolean(raw.isTemporaryOutOfStock),
    is_supplier_temporary_not_available: Boolean(
      raw.isSupplierTemporaryNotAvailable,
    ),
    product_launch_date: raw.productLaunchDate ?? null,
    image_url: imageUrl,
    raw: raw as Record<string, unknown>,
    synced_at: syncedAt,
    store_count: null,
  };
}

/** True when the only hard stock flag set is the supplier temporary flag. */
export function isSupplierOnlyFlag(
  row: Pick<
    SystembolagetProductRow,
    | "is_discontinued"
    | "is_completely_out_of_stock"
    | "is_temporary_out_of_stock"
    | "is_supplier_temporary_not_available"
  >,
): boolean {
  return (
    row.is_supplier_temporary_not_available &&
    !row.is_discontinued &&
    !row.is_completely_out_of_stock &&
    !row.is_temporary_out_of_stock
  );
}

/**
 * Read availableNumberOfStores from the Systembolaget product page
 * (__NEXT_DATA__). Search API does not expose this field.
 */
export async function fetchAvailableNumberOfStores(
  productNumber: string,
): Promise<number | null> {
  const url = `https://www.systembolaget.se/produkt/vin/${encodeURIComponent(productNumber)}/`;
  let lastError: unknown;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "text/html",
          "User-Agent":
            "Mozilla/5.0 (compatible; CrowdVineSystembolagetSync/1.0)",
          Referer: "https://www.systembolaget.se/",
        },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Product page HTTP ${res.status} for ${productNumber}`);
      }
      const html = await res.text();
      const match = html.match(/"availableNumberOfStores"\s*:\s*(\d+)/);
      if (!match) return null;
      const n = Number.parseInt(match[1]!, 10);
      return Number.isFinite(n) ? n : null;
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_RETRIES) await sleep(250 * (attempt + 1));
    }
  }
  console.warn(
    "[systembolaget-sync] store-count fetch failed",
    productNumber,
    lastError instanceof Error ? lastError.message : lastError,
  );
  return null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(
  filterQuery: string,
  page: number,
): Promise<z.infer<typeof SbSearchResponseSchema>> {
  const url = `${SB_API_BASE}?${filterQuery}&size=${PAGE_SIZE}&page=${page}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          accept: "application/json",
          "ocp-apim-subscription-key": SB_SUBSCRIPTION_KEY,
          Referer: "https://www.systembolaget.se/",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Systembolaget API HTTP ${res.status} for ${url}`);
      }

      const json: unknown = await res.json();
      const parsed = SbSearchResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error(
          `Systembolaget API response shape invalid: ${parsed.error.message}`,
        );
      }
      return parsed.data;
    } catch (err) {
      lastError = err;
      if (attempt < FETCH_RETRIES) {
        await sleep(500 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

export type SyncTiming = {
  walkMs: number;
  directMs: number;
  stageMs: number;
  storeCountMs: number;
  promoteMs: number;
  backfillMs: number;
};

export type SyncSuccessResult = {
  ok: true;
  fetched: number;
  wines: number;
  inserted: number;
  durationMs: number;
  promotePath: "rpc" | "client_fallback";
  assortmentBreakdown: Record<string, number>;
  countryWineHits: number;
  countryOnlyAdded: number;
  oldCount: number;
  newCount: number;
  directFetched: string[];
  timing: SyncTiming;
};

export type SyncTimeoutResult = {
  ok: false;
  reason: "timeout_guard";
  completedFilters: string[];
  remainingFilters: string[];
  durationMs: number;
  timing: Pick<SyncTiming, "walkMs">;
};

export type SyncShrinkResult = {
  ok: false;
  reason: "shrink_guard";
  oldCount: number;
  newCount: number;
  durationMs: number;
  directFetched: string[];
  timing: Pick<SyncTiming, "walkMs" | "directMs" | "stageMs">;
};

export type SyncResult = SyncSuccessResult | SyncTimeoutResult | SyncShrinkResult;

export type SyncLogOutcome = "promoted" | "guard_blocked" | "timeout" | "error";

export type SyncOptions = {
  /** Admin override. The cron must leave this false. */
  allowShrink?: boolean;
};

/** True when newCount is more than 5% below oldCount. An empty live table never trips. */
export function shrinkExceedsLimit(oldCount: number, newCount: number): boolean {
  if (oldCount <= 0) return false;
  return (oldCount - newCount) * 1000 > oldCount * SHRINK_LIMIT_PER_MILLE;
}

function replacePriceBound(
  query: string,
  bound: "min" | "max",
  value: number,
): string {
  const parts = query
    .split("&")
    .filter((part) => part.length > 0 && !part.startsWith(`price.${bound}=`));
  parts.push(`price.${bound}=${value}`);
  return parts.join("&");
}

/**
 * Client-side promote when the SQL function is blocked from unqualified DELETE.
 * Still only runs after a full staging load; clears staging at the end.
 * Must refuse empty input — same failure mode as unguarded RPC wipe.
 */
async function promoteProductsClientSide(
  sb: ReturnType<typeof getSupabaseAdmin>,
  rows: SystembolagetProductRow[],
): Promise<number> {
  if (rows.length === 0) {
    throw new Error(
      "Refusing client promote: fetched product set is empty. Table left unchanged.",
    );
  }

  const { error: wipeErr } = await sb
    .from("systembolaget_products")
    .delete()
    .neq("product_number", "");
  if (wipeErr) {
    throw new Error(`Client promote wipe failed: ${wipeErr.message}`);
  }

  let inserted = 0;
  for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE);
    const { error: insertErr } = await sb
      .from("systembolaget_products")
      .insert(chunk);
    if (insertErr) {
      throw new Error(
        `Client promote insert failed at offset ${offset}: ${insertErr.message}`,
      );
    }
    inserted += chunk.length;
  }

  const { error: clearErr } = await sb
    .from("systembolaget_products_staging")
    .delete()
    .neq("product_number", "");
  if (clearErr) {
    throw new Error(`Client promote staging clear failed: ${clearErr.message}`);
  }

  return inserted;
}

type FilterFetchResult = {
  key: string;
  pages: number;
  wineHits: number;
  fetched: number;
  rows: SystembolagetProductRow[];
  /** API metadata.docCount for this query. All categories, not wines only. */
  apiDocCount: number | null;
  /** True when the walk stopped short of apiDocCount or the page cap. */
  truncated: boolean;
  /** True when this query was price-split because docCount exceeded the window. */
  splitForCap: boolean;
};

function queryPriceMin(query: string): number {
  const part = query.split("&").find((p) => p.startsWith("price.min="));
  if (!part) return 0;
  const n = Number(part.slice("price.min=".length));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Pick a price.max that leaves both sides of an over-cap query under the
 * result window. The API's priceRange facet stays at the global catalog
 * range even after a price filter, so it cannot be used as the cut.
 */
async function findBalancedPriceMax(
  query: string,
  parentCount: number,
): Promise<number | null> {
  const floor = queryPriceMin(query);
  const candidates = [400, 500, 700, 1000, 1500, 2500, 4000, 8000, 15000].filter(
    (price) => price > floor,
  );
  const probed = await Promise.all(
    candidates.map(async (price) => {
      const page = await fetchPage(replacePriceBound(query, "max", price), 1);
      const low =
        typeof page.metadata.docCount === "number" ? page.metadata.docCount : null;
      return { price, low };
    }),
  );
  let best: { price: number; gap: number } | null = null;
  for (const { price, low } of probed) {
    if (low == null || low <= 0 || low >= parentCount) continue;
    const high = parentCount - low;
    if (low > API_RESULT_WINDOW || high > API_RESULT_WINDOW) continue;
    const gap = Math.abs(low - parentCount / 2);
    if (!best || gap < best.gap) best = { price, gap };
  }
  return best?.price ?? null;
}

async function walkFetchedQuery(
  query: string,
  key: string,
  syncedAt: string,
  shouldAbort: () => boolean,
  first: z.infer<typeof SbSearchResponseSchema>,
): Promise<FilterFetchResult> {
  let pageData = first;
  let page = 1;
  let pages = 0;
  let wineHits = 0;
  let fetched = 0;
  const rows: SystembolagetProductRow[] = [];
  const docCount =
    typeof first.metadata.docCount === "number" ? first.metadata.docCount : null;

  while (pages < MAX_PAGES_PER_FILTER) {
    if (shouldAbort()) {
      throw new Error(`Aborted mid-filter: ${key}`);
    }
    pages += 1;
    fetched += pageData.products.length;

    for (const item of pageData.products) {
      const parsed = SbProductSchema.safeParse(item);
      if (!parsed.success) {
        throw new Error(
          `Product shape invalid in ${key} page ${page}: ${parsed.error.message}`,
        );
      }
      if (parsed.data.categoryLevel1 !== "Vin") continue;
      wineHits += 1;
      rows.push(mapProduct(parsed.data, syncedAt));
    }

    const next = pageData.metadata.nextPage;
    if (next === -1) break;
    if (docCount != null && fetched >= docCount) break;
    page = next;
    pageData = await fetchPage(query, page);
  }

  const hitPageCap =
    pages >= MAX_PAGES_PER_FILTER && pageData.metadata.nextPage !== -1;
  const truncated = hitPageCap || (docCount != null && fetched < docCount);
  if (truncated) {
    console.warn("[systembolaget-sync] filter short of API docCount", {
      filter: key,
      apiDocCount: docCount,
      fetched,
      pages,
      pageCap: MAX_PAGES_PER_FILTER,
    });
  }

  return {
    key,
    pages,
    wineHits,
    fetched,
    rows,
    apiDocCount: docCount,
    truncated,
    splitForCap: false,
  };
}

async function fetchQuery(
  query: string,
  key: string,
  syncedAt: string,
  shouldAbort: () => boolean,
  depth: number,
): Promise<FilterFetchResult> {
  if (shouldAbort()) {
    throw new Error(`Aborted mid-filter: ${key}`);
  }
  const first = await fetchPage(query, 1);
  const docCount =
    typeof first.metadata.docCount === "number" ? first.metadata.docCount : null;
  if (
    docCount != null &&
    docCount > API_RESULT_WINDOW &&
    depth < MAX_PRICE_SPLITS
  ) {
    const lowMax = await findBalancedPriceMax(query, docCount);
    if (lowMax != null) {
      const highMin = lowMax + 1;
      console.warn("[systembolaget-sync] splitting filter past result window", {
        filter: key,
        apiDocCount: docCount,
        lowMax,
        highMin,
      });
      const [low, high] = await Promise.all([
        fetchQuery(
          replacePriceBound(query, "max", lowMax),
          `${key} ≤${lowMax}`,
          syncedAt,
          shouldAbort,
          depth + 1,
        ),
        fetchQuery(
          replacePriceBound(query, "min", highMin),
          `${key} ≥${highMin}`,
          syncedAt,
          shouldAbort,
          depth + 1,
        ),
      ]);
      const fetched = low.fetched + high.fetched;
      return {
        key,
        pages: low.pages + high.pages,
        wineHits: low.wineHits + high.wineHits,
        fetched,
        rows: [...low.rows, ...high.rows],
        apiDocCount: docCount,
        truncated:
          low.truncated || high.truncated || fetched < docCount,
        splitForCap: true,
      };
    }
    console.warn(
      "[systembolaget-sync] partition over cap but no price cut found",
      { filter: key, apiDocCount: docCount },
    );
  }

  const walked = await walkFetchedQuery(
    query,
    key,
    syncedAt,
    shouldAbort,
    first,
  );
  return walked;
}

async function fetchAssortmentFilter(
  filter: (typeof ASSORTMENT_FILTERS)[number],
  syncedAt: string,
  shouldAbort: () => boolean,
): Promise<FilterFetchResult> {
  return fetchQuery(filter.query, filter.key, syncedAt, shouldAbort, 0);
}

/**
 * Fetch all assortment filters (in parallel), map Vin products, and atomically
 * replace systembolaget_products. Aborts without writing on fetch failure or
 * the timeout guard.
 */
export async function runSystembolagetSync(
  options: SyncOptions = {},
): Promise<SyncResult> {
  const started = Date.now();
  const syncedAt = new Date().toISOString();
  const completedFilters: string[] = [];
  let timedOut = false;
  let walkMs = 0;
  let assortmentBreakdown: Record<string, number> = {};

  console.log("[systembolaget-sync] start", {
    filters: ASSORTMENT_FILTERS.length,
    countryFilters: ORDERVAROR_COUNTRIES.length,
    mode: "parallel",
    fetchTimeoutGuardMs: FETCH_TIMEOUT_GUARD_MS,
    measuredPostFetchBudgetMs: MEASURED_POST_FETCH_BUDGET_MS,
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
  }, FETCH_TIMEOUT_GUARD_MS);

  let countryWineHits = 0;
  let countryOnlyAdded = 0;
  let largestPartition: OrdervarorPartitionStat | null = null;

  try {
    const logFilterDone = (result: FilterFetchResult) => {
      completedFilters.push(result.key);
      console.log("[systembolaget-sync] filter done", {
        filter: result.key,
        pages: result.pages,
        wineHits: result.wineHits,
        fetched: result.fetched,
        apiDocCount: result.apiDocCount,
        truncated: result.truncated,
        elapsedMs: Date.now() - started,
      });
    };

    const assortmentPromise = Promise.all(
      ASSORTMENT_FILTERS.map(async (filter) => {
        const result = await fetchAssortmentFilter(
          filter,
          syncedAt,
          () => timedOut,
        );
        logFilterDone(result);
        return result;
      }),
    );

    const countryPromise = mapPool(
      [...ORDERVAROR_COUNTRIES],
      COUNTRY_WALK_CONCURRENCY,
      async (country) => {
        const result = await fetchQuery(
          ordervarorCountryQuery(country),
          `Ordervaror · ${country}`,
          syncedAt,
          () => timedOut,
          0,
        );
        logFilterDone(result);
        return result;
      },
    );

    let assortmentResults: FilterFetchResult[];
    let countryResults: FilterFetchResult[];
    try {
      const allWalks = Promise.all([assortmentPromise, countryPromise]).then(
        ([assortment, country]) => ({
          kind: "ok" as const,
          assortment,
          country,
        }),
      );
      const timeoutWatch = new Promise<{ kind: "timeout" }>((resolve) => {
        const wait = setInterval(() => {
          if (timedOut) {
            clearInterval(wait);
            resolve({ kind: "timeout" });
          }
        }, 250);
      });

      const winner = await Promise.race([allWalks, timeoutWatch]);
      walkMs = Date.now() - started;
      if (winner.kind === "timeout") {
        void allWalks.catch(() => undefined);
        const remainingFilters = [
          ...ASSORTMENT_FILTERS.map((f) => f.key),
          ...ORDERVAROR_COUNTRIES.map((c) => `Ordervaror · ${c}`),
        ].filter((k) => !completedFilters.includes(k));
        console.warn(
          "[systembolaget-sync] timeout_guard — aborting without write",
          {
            elapsedMs: walkMs,
            fetchTimeoutGuardMs: FETCH_TIMEOUT_GUARD_MS,
            completedFilters: [...completedFilters],
            remainingFilters,
          },
        );
        const result: SyncTimeoutResult = {
          ok: false,
          reason: "timeout_guard",
          completedFilters: [...completedFilters],
          remainingFilters,
          durationMs: walkMs,
          timing: { walkMs },
        };
        await writeSyncLog({
          syncedAt,
          outcome: "timeout",
          wines: null,
          filterCounts: Object.fromEntries(
            completedFilters.map((k) => [k, null]),
          ),
          durationMs: walkMs,
          timing: { walkMs },
        });
        return result;
      }
      assortmentResults = winner.assortment;
      countryResults = winner.country;
    } catch (err) {
      walkMs = Date.now() - started;
      if (
        timedOut ||
        (err instanceof Error && err.message.startsWith("Aborted mid-filter"))
      ) {
        const remainingFilters = [
          ...ASSORTMENT_FILTERS.map((f) => f.key),
          ...ORDERVAROR_COUNTRIES.map((c) => `Ordervaror · ${c}`),
        ].filter((k) => !completedFilters.includes(k));
        const result: SyncTimeoutResult = {
          ok: false,
          reason: "timeout_guard",
          completedFilters: [...completedFilters],
          remainingFilters,
          durationMs: walkMs,
          timing: { walkMs },
        };
        await writeSyncLog({
          syncedAt,
          outcome: "timeout",
          wines: null,
          filterCounts: {},
          durationMs: walkMs,
          timing: { walkMs },
        });
        return result;
      }
      throw err;
    }

    const byNumber = new Map<string, SystembolagetProductRow>();
    assortmentBreakdown = {};
    let fetched = 0;

    for (const result of assortmentResults) {
      fetched += result.fetched;
      assortmentBreakdown[result.key] = result.wineHits;
      for (const row of result.rows) {
        byNumber.set(row.product_number, row);
      }
    }

    const afterAssortment = byNumber.size;
    for (const result of countryResults) {
      fetched += result.fetched;
      assortmentBreakdown[result.key] = result.wineHits;
      countryWineHits += result.wineHits;
      for (const row of result.rows) {
        if (!byNumber.has(row.product_number)) {
          countryOnlyAdded += 1;
        }
        byNumber.set(row.product_number, row);
      }
    }
    console.log("[systembolaget-sync] country union", {
      afterAssortment,
      countryWineHits,
      countryOnlyAdded,
      union: byNumber.size,
    });

    const ordervarorPartitions: OrdervarorPartitionStat[] = [
      ...assortmentResults,
      ...countryResults,
    ].flatMap((result) => {
      if (
        !isOrdervarorPartitionKey(result.key) ||
        result.apiDocCount == null
      ) {
        return [];
      }
      return [{ key: result.key, apiDocCount: result.apiDocCount }];
    });
    largestPartition = largestOrdervarorPartition(ordervarorPartitions);
    const overCap = ordervarorPartitions.filter(
      (p) => p.apiDocCount > ORDERVAROR_PARTITION_CAP,
    );
    const splitAttempted = [...assortmentResults, ...countryResults].some(
      (r) => r.splitForCap,
    );
    console.log("[systembolaget-sync] ordervaror partitions", {
      largest: largestPartition,
      overCap,
      splitAttempted,
    });
    if (overCap.length > 0 && largestPartition) {
      void alertSystembolagetPartitionCap({
        largest: largestPartition,
        overCap,
        splitAttempted,
      }).catch((err) => {
        console.error(
          "[systembolaget-sync] partition-cap alert failed",
          err instanceof Error ? err.message : err,
        );
      });
    }

    const rows = Array.from(byNumber.values());
    if (rows.length === 0) {
      throw new Error(
        "Refusing to write: sync fetched zero Vin products. Table left unchanged.",
      );
    }

    const sb = getSupabaseAdmin();
    const previousProductNumbers = await listAllProductNumbers(
      sb,
      "systembolaget_products",
    );

    const stageStarted = Date.now();
    const { error: clearErr } = await sb
      .from("systembolaget_products_staging")
      .delete()
      .neq("product_number", "");
    if (clearErr) {
      throw new Error(`Failed to clear staging: ${clearErr.message}`);
    }

    for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
      // Omit jsonb `raw` from staging: a single INSERT SELECT of ~12k fat rows
      // hits the default statement_timeout. Promote stays on the RPC path;
      // raw is backfilled onto products after a successful promote.
      const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE).map((row) => ({
        ...row,
        raw: null,
      }));
      const { error: insertErr } = await sb
        .from("systembolaget_products_staging")
        .insert(chunk);
      if (insertErr) {
        throw new Error(
          `Staging insert failed at offset ${offset}: ${insertErr.message}`,
        );
      }
    }
    const stageMs = Date.now() - stageStarted;

    const directStarted = Date.now();
    const direct = await fetchTrackedProductsMissingFromStaging(sb, syncedAt);
    const directMs = Date.now() - directStarted;
    if (direct.rows.length > 0) {
      const { error: directErr } = await sb
        .from("systembolaget_products_staging")
        .insert(direct.rows.map((row) => ({ ...row, raw: null })));
      if (directErr) {
        throw new Error(
          `Direct-fetch staging insert failed: ${directErr.message}`,
        );
      }
      rows.push(...direct.rows);
      fetched += direct.rows.length;
    }

    const storeCountStarted = Date.now();
    const storeCount = await enrichTrackedStoreCounts(
      sb,
      rows,
      () => timedOut,
    );
    const storeCountMs = Date.now() - storeCountStarted;
    fetched += storeCount.fetched;

    const oldCount = await countTable(sb, "systembolaget_products");
    const newCount = await countTable(sb, "systembolaget_products_staging");
    const productNumbers = rows.map((r) => r.product_number);

    if (shrinkExceedsLimit(oldCount, newCount) && !options.allowShrink) {
      console.warn("[systembolaget-sync] shrink_guard — refusing promote", {
        oldCount,
        newCount,
      });
      const { error: refuseClearErr } = await sb
        .from("systembolaget_products_staging")
        .delete()
        .neq("product_number", "");
      if (refuseClearErr) {
        throw new Error(
          `Failed to clear refused staging: ${refuseClearErr.message}`,
        );
      }
      const durationMs = Date.now() - started;
      const result: SyncShrinkResult = {
        ok: false,
        reason: "shrink_guard",
        oldCount,
        newCount,
        durationMs,
        directFetched: direct.added,
        timing: { walkMs, directMs, stageMs },
      };
      await writeSyncLog({
        syncedAt,
        outcome: "guard_blocked",
        wines: newCount,
        filterCounts: assortmentBreakdown,
        durationMs,
        oldCount,
        newCount,
        directFetched: direct.added,
        productNumbers,
        previousProductNumbers,
        timing: { walkMs, directMs, stageMs, storeCountMs },
        largestOrdervarorPartition: largestPartition,
      });
      return result;
    }
    if (shrinkExceedsLimit(oldCount, newCount) && options.allowShrink) {
      console.warn("[systembolaget-sync] shrink_guard overridden", {
        oldCount,
        newCount,
      });
    }

    const promoteStarted = Date.now();
    const { data: insertedRaw, error: promoteErr } = await sb.rpc(
      "systembolaget_promote_products",
    );

    let inserted: number;
    let promotePath: "rpc" | "client_fallback";
    if (
      promoteErr &&
      /DELETE requires a WHERE clause/i.test(promoteErr.message)
    ) {
      console.warn(
        "[systembolaget-sync] promote RPC blocked unqualified DELETE — using client fallback",
        { error: promoteErr.message },
      );
      inserted = await promoteProductsClientSide(sb, rows);
      promotePath = "client_fallback";
    } else if (promoteErr) {
      throw new Error(`Promote failed: ${promoteErr.message}`);
    } else {
      inserted =
        typeof insertedRaw === "number"
          ? insertedRaw
          : Number.parseInt(String(insertedRaw ?? rows.length), 10);
      promotePath = "rpc";
      console.log("[systembolaget-sync] promote via RPC", { inserted });
    }
    const promoteMs = Date.now() - promoteStarted;

    let backfillMs = 0;
    if (promotePath === "rpc") {
      const backfillStarted = Date.now();
      for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE);
        const { error: rawErr } = await sb
          .from("systembolaget_products")
          .upsert(chunk, { onConflict: "product_number" });
        if (rawErr) {
          throw new Error(
            `Raw backfill failed at offset ${offset}: ${rawErr.message}`,
          );
        }
      }
      backfillMs = Date.now() - backfillStarted;
      console.log("[systembolaget-sync] raw backfill done", {
        rows: rows.length,
      });
    }

    const timing: SyncTiming = {
      walkMs,
      directMs,
      stageMs,
      storeCountMs,
      promoteMs,
      backfillMs,
    };
    const durationMs = Date.now() - started;
    console.log("[systembolaget-sync] finish", {
      fetched,
      wines: rows.length,
      inserted,
      durationMs,
      promotePath,
      assortmentBreakdown,
      countryWineHits,
      countryOnlyAdded,
      oldCount,
      newCount,
      directFetched: direct.added,
      timing,
    });

    await writeSyncLog({
      syncedAt,
      outcome: "promoted",
      wines: rows.length,
      filterCounts: {
        ...assortmentBreakdown,
        _countryWineHits: countryWineHits,
        _countryOnlyAdded: countryOnlyAdded,
      },
      durationMs,
      oldCount,
      newCount,
      directFetched: direct.added,
      productNumbers,
      previousProductNumbers,
      timing,
      largestOrdervarorPartition: largestPartition,
    });

    return {
      ok: true,
      fetched,
      wines: rows.length,
      inserted,
      durationMs,
      promotePath,
      assortmentBreakdown,
      countryWineHits,
      countryOnlyAdded,
      oldCount,
      newCount,
      directFetched: direct.added,
      timing,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - started;
    await writeSyncLog({
      syncedAt,
      outcome: "error",
      wines: null,
      filterCounts: assortmentBreakdown,
      durationMs,
      timing: { walkMs },
      errorMessage: message,
      largestOrdervarorPartition: largestPartition,
    });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function countTable(
  sb: ReturnType<typeof getSupabaseAdmin>,
  table: "systembolaget_products" | "systembolaget_products_staging",
): Promise<number> {
  const { count, error } = await sb
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }
  return count ?? 0;
}

async function listProductNumbers(
  sb: ReturnType<typeof getSupabaseAdmin>,
  table:
    | "systembolaget_curated"
    | "systembolaget_recommendations"
    | "systembolaget_products"
    | "systembolaget_products_staging",
): Promise<string[]> {
  const numbers: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from(table)
      .select("product_number")
      .range(from, from + 999);
    if (error) {
      throw new Error(`Failed to list ${table}: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (row.product_number) numbers.push(String(row.product_number));
    }
    if (!data || data.length < 1000) break;
  }
  return numbers;
}

async function listAllProductNumbers(
  sb: ReturnType<typeof getSupabaseAdmin>,
  table: "systembolaget_products" | "systembolaget_products_staging",
): Promise<string[]> {
  return listProductNumbers(sb, table);
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

type SyncLogWrite = {
  syncedAt: string;
  outcome: SyncLogOutcome;
  wines: number | null;
  filterCounts: Record<string, number | null>;
  durationMs: number;
  oldCount?: number;
  newCount?: number;
  directFetched?: string[];
  productNumbers?: string[];
  previousProductNumbers?: string[];
  timing: Record<string, number>;
  errorMessage?: string;
  largestOrdervarorPartition?: OrdervarorPartitionStat | null;
};

async function writeSyncLog(entry: SyncLogWrite): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    const { error } = await sb.from("systembolaget_sync_log").insert({
      synced_at: entry.syncedAt,
      wines: entry.wines,
      filter_counts: entry.filterCounts,
      duration_ms: entry.durationMs,
      outcome: entry.outcome,
      old_count: entry.oldCount ?? null,
      new_count: entry.newCount ?? null,
      direct_fetched: entry.directFetched ?? [],
      product_numbers: entry.productNumbers ?? null,
      previous_product_numbers: entry.previousProductNumbers ?? null,
      error_message: entry.errorMessage ?? null,
      timing: entry.timing,
      largest_ordervaror_partition: entry.largestOrdervarorPartition ?? null,
    });
    if (error) {
      console.error("[systembolaget-sync] sync_log insert failed", error.message);
    }
  } catch (err) {
    console.error(
      "[systembolaget-sync] sync_log insert failed",
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * For tracked curated/recommendation PNs whose only true stock flag is the
 * supplier flag, fetch availableNumberOfStores from the product page into
 * staging (+ in-memory rows). Concurrency 8; aborts when the fetch budget
 * (timedOut) is exhausted.
 */
async function enrichTrackedStoreCounts(
  sb: ReturnType<typeof getSupabaseAdmin>,
  rows: SystembolagetProductRow[],
  shouldAbort: () => boolean,
): Promise<{ updated: string[]; fetched: number; aborted: boolean }> {
  if (shouldAbort()) {
    console.warn(
      "[systembolaget-sync] store-count skipped — fetch budget exhausted",
    );
    return { updated: [], fetched: 0, aborted: true };
  }

  const tracked = [
    ...(await listProductNumbers(sb, "systembolaget_curated")),
    ...(await listProductNumbers(sb, "systembolaget_recommendations")),
  ];
  const wanted = new Set(tracked);
  const byNumber = new Map(rows.map((row) => [row.product_number, row]));
  const candidates = [...wanted].filter((productNumber) => {
    const row = byNumber.get(productNumber);
    return row != null && isSupplierOnlyFlag(row);
  });

  if (candidates.length === 0) {
    console.log("[systembolaget-sync] store-count: no supplier-only tracked wines");
    return { updated: [], fetched: 0, aborted: false };
  }

  let aborted = false;
  let fetched = 0;
  const updated: string[] = [];
  const results = await mapPool(
    candidates,
    DIRECT_FETCH_CONCURRENCY,
    async (productNumber) => {
      if (shouldAbort()) {
        aborted = true;
        return { productNumber, storeCount: null as number | null };
      }
      fetched += 1;
      const storeCount = await fetchAvailableNumberOfStores(productNumber);
      return { productNumber, storeCount };
    },
  );

  for (const result of results) {
    if (result.storeCount == null) continue;
    const { error } = await sb
      .from("systembolaget_products_staging")
      .update({ store_count: result.storeCount })
      .eq("product_number", result.productNumber);
    if (error) {
      throw new Error(
        `Failed to write store_count for ${result.productNumber}: ${error.message}`,
      );
    }
    const row = byNumber.get(result.productNumber);
    if (row) row.store_count = result.storeCount;
    updated.push(result.productNumber);
  }

  console.log("[systembolaget-sync] store-count", {
    candidates: candidates.length,
    fetched,
    updated,
    aborted,
    concurrency: DIRECT_FETCH_CONCURRENCY,
  });

  return { updated, fetched, aborted };
}

/**
 * Curated and recommendation rows must not depend on the assortment walk.
 * Anything missing from staging is fetched by product number and staged.
 * Ordervaror browse often omits bottles that textQuery still returns.
 */
async function fetchTrackedProductsMissingFromStaging(
  sb: ReturnType<typeof getSupabaseAdmin>,
  syncedAt: string,
): Promise<{ added: string[]; notFound: string[]; rows: SystembolagetProductRow[] }> {
  const tracked = [
    ...(await listProductNumbers(sb, "systembolaget_curated")),
    ...(await listProductNumbers(sb, "systembolaget_recommendations")),
  ];
  const wanted = [...new Set(tracked)];
  const present = new Set<string>();
  for (let offset = 0; offset < wanted.length; offset += 200) {
    const chunk = wanted.slice(offset, offset + 200);
    if (chunk.length === 0) continue;
    const { data, error } = await sb
      .from("systembolaget_products_staging")
      .select("product_number")
      .in("product_number", chunk);
    if (error) {
      throw new Error(`Failed to read staging product numbers: ${error.message}`);
    }
    for (const row of data ?? []) {
      present.add(String(row.product_number));
    }
  }

  const missing = wanted.filter((productNumber) => !present.has(productNumber));
  const fetched = await mapPool(
    missing,
    DIRECT_FETCH_CONCURRENCY,
    async (productNumber) => {
      const data = await fetchPage(
        `textQuery=${encodeURIComponent(productNumber)}`,
        1,
      );
      for (const item of data.products) {
        const parsed = SbProductSchema.safeParse(item);
        if (!parsed.success) continue;
        if (parsed.data.productNumber === productNumber) {
          return {
            productNumber,
            row: mapProduct(parsed.data, syncedAt),
          };
        }
      }
      return { productNumber, row: null };
    },
  );

  const added: string[] = [];
  const notFound: string[] = [];
  const rows: SystembolagetProductRow[] = [];
  for (const item of fetched) {
    if (!item.row) {
      notFound.push(item.productNumber);
      continue;
    }
    rows.push(item.row);
    added.push(item.productNumber);
  }

  console.log("[systembolaget-sync] direct product fetch", {
    missing,
    added,
    notFound,
    concurrency: DIRECT_FETCH_CONCURRENCY,
  });

  return { added, notFound, rows };
}
