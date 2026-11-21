/**
 * Resumable raw jsonb backfill for systembolaget_products.
 *
 * Staging omits `raw` so promote stays under statement_timeout. After a
 * successful RPC promote the sync upserts `raw` onto products. Fat chunks of
 * 500 rows intermittently exceed authenticator's 8s statement_timeout
 * ("Raw backfill failed at offset …"). This module upserts the same row
 * shape in smaller batches with an offset cursor and a wall-clock budget so
 * each Vercel invocation stays inside maxDuration.
 */

import type { getSupabaseAdmin } from "@/lib/supabase-admin";

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

/** Same columns the sync previously upserted during raw backfill. */
export type RawBackfillRow = {
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
  store_count: number | null;
};

/**
 * Staging inserts of 500 without raw are fine; raw-bearing upserts through
 * PostgREST share authenticator's 8s statement_timeout. Prod sync_log showed
 * failures at chunk size 500; 100 keeps each statement small while limiting
 * round-trips for ~14k wines.
 */
export const RAW_BACKFILL_CHUNK_SIZE = 100;

/** Leave headroom under the 300s route maxDuration for logging / coverage. */
export const RAW_BACKFILL_DEFAULT_BUDGET_MS = 90_000;

export type RawBackfillProgress = {
  done: boolean;
  /** Next row index to process (exclusive end of what was written). */
  nextOffset: number;
  upserted: number;
  durationMs: number;
  total: number;
  chunkSize: number;
};

export type RawBackfillOptions = {
  startOffset?: number;
  chunkSize?: number;
  budgetMs?: number;
  /** Abort between chunks when true (e.g. route timeout guard). */
  shouldAbort?: () => boolean;
  now?: () => number;
};

function isStatementTimeoutMessage(message: string): boolean {
  return /statement timeout|canceling statement/i.test(message);
}

function toUpsertPayload(row: RawBackfillRow, nowIso: string) {
  return {
    ...row,
    last_seen_at: nowIso,
    consecutive_misses: 0,
  };
}

/**
 * Idempotent upsert of raw-bearing product rows onto systembolaget_products.
 * Resumable via startOffset; stops cleanly when the budget or shouldAbort fires.
 */
export async function backfillSystembolagetRaw(
  sb: SupabaseAdmin,
  rows: readonly RawBackfillRow[],
  options: RawBackfillOptions = {},
): Promise<RawBackfillProgress> {
  const chunkSize = Math.max(1, options.chunkSize ?? RAW_BACKFILL_CHUNK_SIZE);
  const budgetMs = options.budgetMs ?? RAW_BACKFILL_DEFAULT_BUDGET_MS;
  const now = options.now ?? Date.now;
  const started = now();
  let offset = Math.max(0, Math.min(options.startOffset ?? 0, rows.length));
  let upserted = 0;
  let currentChunkSize = chunkSize;

  while (offset < rows.length) {
    if (options.shouldAbort?.()) break;
    if (now() - started >= budgetMs) break;

    const end = Math.min(offset + currentChunkSize, rows.length);
    const nowIso = new Date(now()).toISOString();
    const chunk = rows.slice(offset, end).map((row) => toUpsertPayload(row, nowIso));

    const { error } = await sb
      .from("systembolaget_products")
      .upsert(chunk, { onConflict: "product_number" });

    if (error) {
      if (
        isStatementTimeoutMessage(error.message) &&
        currentChunkSize > 1 &&
        chunk.length > 1
      ) {
        currentChunkSize = Math.max(1, Math.floor(currentChunkSize / 2));
        console.warn("[systembolaget-sync] raw backfill chunk timeout — retry smaller", {
          offset,
          nextChunkSize: currentChunkSize,
          error: error.message,
        });
        continue;
      }
      throw new Error(
        `Raw backfill failed at offset ${offset}: ${error.message}`,
      );
    }

    upserted += chunk.length;
    offset = end;
    // Restore preferred size after a successful smaller retry.
    currentChunkSize = chunkSize;
  }

  return {
    done: offset >= rows.length,
    nextOffset: offset,
    upserted,
    durationMs: now() - started,
    total: rows.length,
    chunkSize,
  };
}

/**
 * Persist remaining raw rows onto staging so a later invocation can resume
 * without holding the in-memory walk. Staging is empty after promote finalize.
 * Only product_number + raw (+ synced_at) are required for the resume path.
 */
export async function enqueueRawBackfillPending(
  sb: SupabaseAdmin,
  rows: readonly Pick<RawBackfillRow, "product_number" | "raw" | "synced_at">[],
  options: { chunkSize?: number } = {},
): Promise<number> {
  const chunkSize = Math.max(1, options.chunkSize ?? RAW_BACKFILL_CHUNK_SIZE);
  let written = 0;
  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize).map((row) => ({
      product_number: row.product_number,
      raw: row.raw,
      synced_at: row.synced_at,
    }));
    const { error } = await sb
      .from("systembolaget_products_staging")
      .upsert(chunk, { onConflict: "product_number" });
    if (error) {
      throw new Error(
        `Raw backfill enqueue failed at offset ${offset}: ${error.message}`,
      );
    }
    written += chunk.length;
  }
  return written;
}

export type StagingRawDrainProgress = {
  done: boolean;
  /** Exclusive product_number cursor (lexicographic); null when done or empty. */
  nextCursor: string | null;
  upserted: number;
  durationMs: number;
  chunkSize: number;
};

/**
 * Resume raw backfill from staging rows left by an incomplete run.
 * Updates only product_number + raw on products (idempotent), then deletes
 * the drained staging rows.
 */
export async function drainRawBackfillFromStaging(
  sb: SupabaseAdmin,
  options: {
    startCursor?: string | null;
    chunkSize?: number;
    budgetMs?: number;
    shouldAbort?: () => boolean;
    now?: () => number;
  } = {},
): Promise<StagingRawDrainProgress> {
  const preferredChunkSize = Math.max(
    1,
    options.chunkSize ?? RAW_BACKFILL_CHUNK_SIZE,
  );
  let chunkSize = preferredChunkSize;
  const budgetMs = options.budgetMs ?? RAW_BACKFILL_DEFAULT_BUDGET_MS;
  const now = options.now ?? Date.now;
  const started = now();
  let cursor = options.startCursor ?? null;
  let upserted = 0;

  while (true) {
    if (options.shouldAbort?.()) break;
    if (now() - started >= budgetMs) break;

    let query = sb
      .from("systembolaget_products_staging")
      .select("product_number, raw")
      .not("raw", "is", null)
      .order("product_number", { ascending: true })
      .limit(chunkSize);
    if (cursor) {
      query = query.gt("product_number", cursor);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Raw backfill staging read failed: ${error.message}`);
    }
    const batch = data ?? [];
    if (batch.length === 0) {
      return {
        done: true,
        nextCursor: null,
        upserted,
        durationMs: now() - started,
        chunkSize: preferredChunkSize,
      };
    }

    const payload = batch
      .filter(
        (row): row is { product_number: string; raw: Record<string, unknown> } =>
          typeof row.product_number === "string" &&
          row.raw !== null &&
          typeof row.raw === "object",
      )
      .map((row) => ({
        product_number: row.product_number,
        raw: row.raw,
      }));

    if (payload.length === 0) break;

    const { error: upsertErr } = await sb
      .from("systembolaget_products")
      .upsert(payload, { onConflict: "product_number" });
    if (upsertErr) {
      if (
        isStatementTimeoutMessage(upsertErr.message) &&
        chunkSize > 1 &&
        payload.length > 1
      ) {
        chunkSize = Math.max(1, Math.floor(chunkSize / 2));
        console.warn(
          "[systembolaget-sync] staging raw drain timeout — retry smaller",
          { cursor, nextChunkSize: chunkSize, error: upsertErr.message },
        );
        continue;
      }
      throw new Error(
        `Raw backfill staging upsert failed at cursor ${cursor ?? "(start)"}: ${upsertErr.message}`,
      );
    }

    const numbers = payload.map((row) => row.product_number);
    const { error: deleteErr } = await sb
      .from("systembolaget_products_staging")
      .delete()
      .in("product_number", numbers);
    if (deleteErr) {
      throw new Error(
        `Raw backfill staging delete failed: ${deleteErr.message}`,
      );
    }
    upserted += payload.length;
    cursor = numbers[numbers.length - 1] ?? cursor;
    chunkSize = preferredChunkSize;
  }

  // More rows may remain if we stopped on budget/abort.
  const { count, error: countErr } = await sb
    .from("systembolaget_products_staging")
    .select("*", { count: "exact", head: true })
    .not("raw", "is", null);
  if (countErr) {
    throw new Error(`Raw backfill staging count failed: ${countErr.message}`);
  }
  const remaining = count ?? 0;

  return {
    done: remaining === 0,
    nextCursor: remaining === 0 ? null : cursor,
    upserted,
    durationMs: now() - started,
    chunkSize: preferredChunkSize,
  };
}
