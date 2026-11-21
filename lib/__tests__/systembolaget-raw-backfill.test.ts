import { describe, expect, it } from "vitest";

import {
  backfillSystembolagetRaw,
  drainRawBackfillFromStaging,
  enqueueRawBackfillPending,
  RAW_BACKFILL_CHUNK_SIZE,
  type RawBackfillRow,
} from "@/lib/systembolaget/raw-backfill";

function makeRow(n: number): RawBackfillRow {
  return {
    product_number: String(n).padStart(5, "0"),
    product_id: `id-${n}`,
    name_bold: `Wine ${n}`,
    name_thin: null,
    producer_name: "Producer",
    supplier_name: null,
    category_level_1: "Vin",
    category_level_2: "Rött",
    country: "Frankrike",
    origin_level_1: null,
    origin_level_2: null,
    vintage: 2022,
    price: 199,
    volume: 750,
    alcohol_percentage: 12.5,
    grapes: ["Syrah"],
    assortment: "Ordervaror",
    assortment_text: "Ordervaror",
    is_organic: false,
    is_sustainable: false,
    is_discontinued: false,
    is_completely_out_of_stock: false,
    is_temporary_out_of_stock: false,
    is_supplier_temporary_not_available: false,
    product_launch_date: null,
    image_url: null,
    raw: { productNumber: String(n), productNameBold: `Wine ${n}` },
    synced_at: "2026-11-21T00:00:00.000Z",
    store_count: null,
  };
}

type UpsertCall = {
  table: string;
  rows: unknown[];
  onConflict?: string;
};

function createMockSb(options?: {
  failOffsets?: Set<number>;
  failMessage?: string;
  stagingRows?: { product_number: string; raw: Record<string, unknown> }[];
}) {
  const upserts: UpsertCall[] = [];
  const deletes: string[][] = [];
  let staging = [...(options?.stagingRows ?? [])];
  let productsUpsertCount = 0;

  const sb = {
    from(table: string) {
      if (table === "systembolaget_products") {
        return {
          upsert(rows: unknown[], opts?: { onConflict?: string }) {
            const offsetGuess = productsUpsertCount;
            productsUpsertCount += 1;
            if (options?.failOffsets?.has(offsetGuess)) {
              return Promise.resolve({
                error: {
                  message:
                    options.failMessage ??
                    "canceling statement due to statement timeout",
                },
              });
            }
            upserts.push({
              table,
              rows: rows as unknown[],
              onConflict: opts?.onConflict,
            });
            return Promise.resolve({ error: null });
          },
        };
      }

      if (table === "systembolaget_products_staging") {
        return {
          upsert(rows: unknown[], opts?: { onConflict?: string }) {
            upserts.push({
              table,
              rows: rows as unknown[],
              onConflict: opts?.onConflict,
            });
            for (const row of rows as {
              product_number: string;
              raw: Record<string, unknown>;
            }[]) {
              const idx = staging.findIndex(
                (s) => s.product_number === row.product_number,
              );
              if (idx >= 0) staging[idx] = row;
              else staging.push(row);
            }
            return Promise.resolve({ error: null });
          },
          select(_cols: string, opts?: { count?: string; head?: boolean }) {
            const state = {
              cursor: null as string | null,
              limit: 1000,
              onlyNonNullRaw: false,
            };
            const api = {
              not(_col: string, op: string, val: null) {
                if (op === "is" && val === null) state.onlyNonNullRaw = true;
                return api;
              },
              order() {
                return api;
              },
              limit(n: number) {
                state.limit = n;
                return api;
              },
              gt(_col: string, value: string) {
                state.cursor = value;
                return api;
              },
              then(
                resolve: (value: {
                  data: unknown;
                  error: null;
                  count?: number;
                }) => void,
              ) {
                let rows = staging.filter((r) =>
                  state.onlyNonNullRaw ? r.raw != null : true,
                );
                rows = rows.sort((a, b) =>
                  a.product_number.localeCompare(b.product_number),
                );
                if (state.cursor) {
                  rows = rows.filter((r) => r.product_number > state.cursor!);
                }
                if (opts?.head) {
                  resolve({
                    data: null,
                    error: null,
                    count: rows.length,
                  });
                  return;
                }
                resolve({
                  data: rows.slice(0, state.limit),
                  error: null,
                });
              },
            };
            return api;
          },
          delete() {
            return {
              in(_col: string, numbers: string[]) {
                const set = new Set(numbers);
                staging = staging.filter((r) => !set.has(r.product_number));
                deletes.push(numbers);
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }

      throw new Error(`unexpected table ${table}`);
    },
  };

  return { sb, upserts, deletes, getStaging: () => staging };
}

describe("RAW_BACKFILL_CHUNK_SIZE", () => {
  it("is smaller than the historic 500-row staging chunk", () => {
    expect(RAW_BACKFILL_CHUNK_SIZE).toBe(100);
    expect(RAW_BACKFILL_CHUNK_SIZE).toBeLessThan(500);
  });
});

describe("backfillSystembolagetRaw", () => {
  it("upserts idempotently in offset chunks with the same row shape", async () => {
    const rows = Array.from({ length: 250 }, (_, i) => makeRow(i + 1));
    const { sb, upserts } = createMockSb();

    const progress = await backfillSystembolagetRaw(sb as never, rows, {
      chunkSize: 100,
      budgetMs: 60_000,
    });

    expect(progress.done).toBe(true);
    expect(progress.nextOffset).toBe(250);
    expect(progress.upserted).toBe(250);
    expect(upserts).toHaveLength(3);
    expect(upserts.every((c) => c.onConflict === "product_number")).toBe(true);
    expect((upserts[0]!.rows as unknown[]).length).toBe(100);
    expect((upserts[2]!.rows as unknown[]).length).toBe(50);
    const first = upserts[0]!.rows[0] as Record<string, unknown>;
    expect(first).toMatchObject({
      product_number: "00001",
      consecutive_misses: 0,
    });
    expect(first.raw).toEqual(rows[0]!.raw);
    expect(typeof first.last_seen_at).toBe("string");
  });

  it("stops at budget and returns a resumable nextOffset", async () => {
    const rows = Array.from({ length: 500 }, (_, i) => makeRow(i + 1));
    const { sb, upserts } = createMockSb();
    const times = [0, 0, 50, 160, 160, 160];
    let i = 0;
    const now = () => times[Math.min(i++, times.length - 1)]!;

    const first = await backfillSystembolagetRaw(sb as never, rows, {
      chunkSize: 100,
      budgetMs: 150,
      now,
    });

    expect(first.done).toBe(false);
    expect(first.nextOffset).toBe(100);
    expect(first.upserted).toBe(100);
    expect(upserts).toHaveLength(1);

    const second = await backfillSystembolagetRaw(sb as never, rows, {
      startOffset: first.nextOffset,
      chunkSize: 100,
      budgetMs: 60_000,
    });
    expect(second.done).toBe(true);
    expect(second.nextOffset).toBe(500);
    expect(second.upserted).toBe(400);
  });

  it("retries a statement-timeout chunk at half size", async () => {
    const rows = Array.from({ length: 40 }, (_, i) => makeRow(i + 1));
    // First products upsert (chunk of 40) times out; retry at 20 succeeds.
    const { sb, upserts } = createMockSb({
      failOffsets: new Set([0]),
    });

    const progress = await backfillSystembolagetRaw(sb as never, rows, {
      chunkSize: 40,
      budgetMs: 60_000,
    });

    expect(progress.done).toBe(true);
    expect(progress.upserted).toBe(40);
    expect(upserts.length).toBeGreaterThanOrEqual(2);
    expect((upserts[0]!.rows as unknown[]).length).toBe(20);
  });

  it("respects shouldAbort between chunks", async () => {
    const rows = Array.from({ length: 300 }, (_, i) => makeRow(i + 1));
    const { sb, upserts } = createMockSb();
    let calls = 0;

    const progress = await backfillSystembolagetRaw(sb as never, rows, {
      chunkSize: 100,
      budgetMs: 60_000,
      shouldAbort: () => {
        calls += 1;
        return calls > 1;
      },
    });

    expect(progress.done).toBe(false);
    expect(progress.nextOffset).toBe(100);
    expect(upserts).toHaveLength(1);
  });
});

describe("enqueue + drain staging resume", () => {
  it("enqueues remaining rows and drains them idempotently", async () => {
    const rows = Array.from({ length: 150 }, (_, i) => makeRow(i + 1));
    const { sb, upserts, getStaging } = createMockSb();

    const enqueued = await enqueueRawBackfillPending(sb as never, rows.slice(100), {
      chunkSize: 50,
    });
    expect(enqueued).toBe(50);
    expect(getStaging()).toHaveLength(50);
    expect(upserts.filter((u) => u.table.endsWith("staging"))).toHaveLength(1);

    const drained = await drainRawBackfillFromStaging(sb as never, {
      chunkSize: 25,
      budgetMs: 60_000,
    });
    expect(drained.done).toBe(true);
    expect(drained.upserted).toBe(50);
    expect(getStaging()).toHaveLength(0);

    const productUpserts = upserts.filter(
      (u) => u.table === "systembolaget_products",
    );
    expect(productUpserts.length).toBe(2);
    expect(
      productUpserts.every((u) =>
        (u.rows as { product_number: string; raw: unknown }[]).every(
          (row) => row.product_number && row.raw,
        ),
      ),
    ).toBe(true);
  });

  it("stops drain on budget and leaves a cursor", async () => {
    const stagingRows = Array.from({ length: 80 }, (_, i) => ({
      product_number: makeRow(i + 1).product_number,
      raw: makeRow(i + 1).raw,
    }));
    const { sb, getStaging } = createMockSb({ stagingRows });
    const times = [0, 0, 160, 160, 160, 160];
    let i = 0;
    const now = () => times[Math.min(i++, times.length - 1)]!;

    const drained = await drainRawBackfillFromStaging(sb as never, {
      chunkSize: 30,
      budgetMs: 150,
      now,
    });

    expect(drained.done).toBe(false);
    expect(drained.upserted).toBe(30);
    expect(drained.nextCursor).toBe("00030");
    expect(getStaging().length).toBe(50);
  });
});
