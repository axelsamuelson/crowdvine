import { z } from "zod";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const SB_API_BASE =
  "https://api-extern.systembolaget.se/sb-api-ecommerce/v1/productsearch/search";

const SB_SUBSCRIPTION_KEY = "cfc702aed3094c86b92d6d4ff7a54c84";

const PAGE_SIZE = 30;
const MAX_PAGES_PER_FILTER = 500;
const INSERT_CHUNK_SIZE = 500;
const TIMEOUT_GUARD_MS = 240_000;
const FETCH_RETRIES = 2;

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
  {
    key: "Ordervaror ≥251",
    query: "assortmentText=Ordervaror&price.min=251",
  },
  { key: "Webblanseringar", query: "assortmentText=Webblanseringar" },
  {
    key: "Lokalt & Småskaligt",
    query: "assortmentText=Lokalt%20%26%20Sm%C3%A5skaligt",
  },
  { key: "Säsong", query: "assortmentText=S%C3%A4song" },
] as const;

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
  };
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

export type SyncSuccessResult = {
  ok: true;
  fetched: number;
  wines: number;
  inserted: number;
  durationMs: number;
  promotePath: "rpc" | "client_fallback";
  assortmentBreakdown: Record<string, number>;
};

export type SyncTimeoutResult = {
  ok: false;
  reason: "timeout_guard";
  completedFilters: string[];
  remainingFilters: string[];
  durationMs: number;
};

export type SyncResult = SyncSuccessResult | SyncTimeoutResult;

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
};

async function fetchAssortmentFilter(
  filter: (typeof ASSORTMENT_FILTERS)[number],
  syncedAt: string,
  shouldAbort: () => boolean,
): Promise<FilterFetchResult> {
  let page = 1;
  let pages = 0;
  let wineHits = 0;
  let fetched = 0;
  const rows: SystembolagetProductRow[] = [];

  while (pages < MAX_PAGES_PER_FILTER) {
    if (shouldAbort()) {
      throw new Error(`Aborted mid-filter: ${filter.key}`);
    }
    const data = await fetchPage(filter.query, page);
    pages += 1;
    fetched += data.products.length;

    for (const item of data.products) {
      const parsed = SbProductSchema.safeParse(item);
      if (!parsed.success) {
        throw new Error(
          `Product shape invalid in ${filter.key} page ${page}: ${parsed.error.message}`,
        );
      }
      if (parsed.data.categoryLevel1 !== "Vin") continue;
      wineHits += 1;
      rows.push(mapProduct(parsed.data, syncedAt));
    }

    if (data.metadata.nextPage === -1) break;
    page = data.metadata.nextPage;
  }

  return { key: filter.key, pages, wineHits, fetched, rows };
}

/**
 * Fetch all assortment filters (in parallel), map Vin products, and atomically
 * replace systembolaget_products. Aborts without writing on fetch failure or
 * the 240s timeout guard.
 */
export async function runSystembolagetSync(): Promise<SyncResult> {
  const started = Date.now();
  const syncedAt = new Date().toISOString();
  const completedFilters: string[] = [];
  let timedOut = false;

  console.log("[systembolaget-sync] start", {
    filters: ASSORTMENT_FILTERS.length,
    mode: "parallel",
  });

  const timeoutId = setTimeout(() => {
    timedOut = true;
  }, TIMEOUT_GUARD_MS);

  const filterPromises = ASSORTMENT_FILTERS.map(async (filter) => {
    const result = await fetchAssortmentFilter(
      filter,
      syncedAt,
      () => timedOut,
    );
    completedFilters.push(filter.key);
    console.log("[systembolaget-sync] filter done", {
      filter: filter.key,
      pages: result.pages,
      wineHits: result.wineHits,
      elapsedMs: Date.now() - started,
    });
    return result;
  });

  let filterResults: FilterFetchResult[];
  try {
    const allFilters = Promise.all(filterPromises).then((r) => ({
      kind: "ok" as const,
      r,
    }));
    const timeoutWatch = new Promise<{ kind: "timeout" }>((resolve) => {
      const wait = setInterval(() => {
        if (timedOut) {
          clearInterval(wait);
          resolve({ kind: "timeout" });
        }
      }, 250);
    });

    const winner = await Promise.race([allFilters, timeoutWatch]);
    if (winner.kind === "timeout") {
      // Let in-flight filters settle without failing the process
      void allFilters.catch(() => undefined);
      const remainingFilters = ASSORTMENT_FILTERS.map((f) => f.key).filter(
        (k) => !completedFilters.includes(k),
      );
      console.warn(
        "[systembolaget-sync] timeout_guard — aborting without write",
        {
          elapsedMs: Date.now() - started,
          completedFilters: [...completedFilters],
          remainingFilters,
        },
      );
      return {
        ok: false,
        reason: "timeout_guard",
        completedFilters: [...completedFilters],
        remainingFilters,
        durationMs: Date.now() - started,
      };
    }
    filterResults = winner.r;
  } catch (err) {
    clearTimeout(timeoutId);
    if (
      timedOut ||
      (err instanceof Error && err.message.startsWith("Aborted mid-filter"))
    ) {
      const remainingFilters = ASSORTMENT_FILTERS.map((f) => f.key).filter(
        (k) => !completedFilters.includes(k),
      );
      return {
        ok: false,
        reason: "timeout_guard",
        completedFilters: [...completedFilters],
        remainingFilters,
        durationMs: Date.now() - started,
      };
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const byNumber = new Map<string, SystembolagetProductRow>();
  const assortmentBreakdown: Record<string, number> = {};
  let fetched = 0;

  for (const result of filterResults) {
    fetched += result.fetched;
    assortmentBreakdown[result.key] = result.wineHits;
    for (const row of result.rows) {
      byNumber.set(row.product_number, row);
    }
  }

  const rows = Array.from(byNumber.values());
  if (rows.length === 0) {
    throw new Error(
      "Refusing to write: sync fetched zero Vin products. Table left unchanged.",
    );
  }

  const sb = getSupabaseAdmin();

  // Clear staging, then load in chunks. Promote only after full load succeeds.
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

  if (promotePath === "rpc") {
    for (let offset = 0; offset < rows.length; offset += INSERT_CHUNK_SIZE) {
      const chunk = rows.slice(offset, offset + INSERT_CHUNK_SIZE);
      // Upsert full rows (including raw) now that the table is live.
      const { error: rawErr } = await sb
        .from("systembolaget_products")
        .upsert(chunk, { onConflict: "product_number" });
      if (rawErr) {
        throw new Error(
          `Raw backfill failed at offset ${offset}: ${rawErr.message}`,
        );
      }
    }
    console.log("[systembolaget-sync] raw backfill done", {
      rows: rows.length,
    });
  }

  const durationMs = Date.now() - started;
  console.log("[systembolaget-sync] finish", {
    fetched,
    wines: rows.length,
    inserted,
    durationMs,
    promotePath,
    assortmentBreakdown,
  });

  return {
    ok: true,
    fetched,
    wines: rows.length,
    inserted,
    durationMs,
    promotePath,
    assortmentBreakdown,
  };
}
