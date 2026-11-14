/**
 * Shared helpers for admin analytics event fetches that must survive
 * PostgREST statement timeouts and row caps without dropping newest days.
 */
import {
  eachDateKeyInclusive,
  toStockholmDateKey,
} from "@/lib/analytics/stockholm-time";

export type CreatedAtRow = { created_at: string };

export type CapResult<T> = {
  rows: T[];
  truncated: boolean;
  /** Stockholm YYYY-MM-DD of the earliest kept row, or null if empty. */
  earliestCoveredDate: string | null;
  /** Stockholm YYYY-MM-DD of the newest kept row, or null if empty. */
  latestCoveredDate: string | null;
};

export type PageQueryArgs = {
  gteIso: string;
  /** Exclusive upper bound; omit/null for open-ended. */
  ltIso: string | null;
  from: number;
  to: number;
  signal?: AbortSignal;
};

export type PageQueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

function sortByCreatedAtAsc<T extends CreatedAtRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.created_at < b.created_at) return -1;
    if (a.created_at > b.created_at) return 1;
    return 0;
  });
}

function coveredDates<T extends CreatedAtRow>(
  rows: T[],
): Pick<CapResult<T>, "earliestCoveredDate" | "latestCoveredDate"> {
  if (rows.length === 0) {
    return { earliestCoveredDate: null, latestCoveredDate: null };
  }
  return {
    earliestCoveredDate: toStockholmDateKey(rows[0].created_at),
    latestCoveredDate: toStockholmDateKey(rows[rows.length - 1].created_at),
  };
}

/**
 * Keep at most `maxRows`, always preferring the newest `created_at` rows.
 * Output is sorted ascending by `created_at`.
 */
export function preferNewestCap<T extends CreatedAtRow>(
  rows: T[],
  maxRows: number,
): CapResult<T> {
  if (!Number.isFinite(maxRows) || maxRows <= 0) {
    return {
      rows: [],
      truncated: rows.length > 0,
      earliestCoveredDate: null,
      latestCoveredDate: null,
    };
  }

  const sortedAsc = sortByCreatedAtAsc(rows);
  if (sortedAsc.length <= maxRows) {
    return {
      rows: sortedAsc,
      truncated: false,
      ...coveredDates(sortedAsc),
    };
  }

  const kept = sortedAsc.slice(sortedAsc.length - maxRows);
  return {
    rows: kept,
    truncated: true,
    ...coveredDates(kept),
  };
}

/**
 * Contiguous UTC windows covering [sinceIso, untilIso) in ~chunkDays steps.
 * Gaps/overlaps are avoided so paging stays complete even across DST.
 */
export function stockholmDateChunkWindows(
  sinceIso: string,
  untilIso: string,
  chunkDays = 7,
): { gteIso: string; ltIso: string; startKey: string; endKeyExclusive: string }[] {
  const startMs = new Date(sinceIso).getTime();
  const endMs = new Date(untilIso).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
    return [];
  }

  const stepMs = Math.max(1, Math.round(chunkDays)) * 24 * 60 * 60 * 1000;
  const windows: {
    gteIso: string;
    ltIso: string;
    startKey: string;
    endKeyExclusive: string;
  }[] = [];

  for (let t = startMs; t < endMs; t += stepMs) {
    const gte = new Date(t);
    const lt = new Date(Math.min(t + stepMs, endMs));
    const gteIso = gte.toISOString();
    const ltIso = lt.toISOString();
    windows.push({
      gteIso,
      ltIso,
      startKey: toStockholmDateKey(gteIso),
      endKeyExclusive: toStockholmDateKey(ltIso),
    });
  }
  return windows;
}

/**
 * Race a promise against a client timeout. Does not cancel the underlying
 * work unless the caller also passes an AbortSignal.
 */
export async function withClientTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `${label}: client timeout after ${Math.round(timeoutMs)}ms`,
            ),
          );
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export type FetchEventsWindowOptions<T extends CreatedAtRow> = {
  sinceIso: string;
  /** Exclusive upper bound; defaults to now. */
  untilIso?: string;
  pageSize?: number;
  /** Safety cap — when hit, oldest rows are dropped. */
  maxRows?: number;
  chunkDays?: number;
  /** Optional overall abort for a single table attempt (e.g. clean view). */
  signal?: AbortSignal;
  queryPage: (args: PageQueryArgs) => Promise<PageQueryResult<T>>;
};

export type FetchEventsWindowResult<T extends CreatedAtRow> = CapResult<T> & {
  error: { message: string } | null;
  /** True when every requested chunk was fully paged. */
  complete: boolean;
};

/**
 * Fetch events in Stockholm date chunks, newest chunk first, paging within
 * each chunk until exhausted. If `maxRows` is hit, keeps newest rows only.
 */
export async function fetchEventsInDateChunks<T extends CreatedAtRow>(
  opts: FetchEventsWindowOptions<T>,
): Promise<FetchEventsWindowResult<T>> {
  const pageSize = opts.pageSize ?? 1000;
  const maxRows = opts.maxRows ?? 100_000;
  const chunkDays = opts.chunkDays ?? 7;
  const untilIso = opts.untilIso ?? new Date().toISOString();
  const windows = stockholmDateChunkWindows(
    opts.sinceIso,
    untilIso,
    chunkDays,
  );

  const collectedNewestFirst: T[] = [];
  let truncatedByCap = false;
  let incomplete = false;

  // Newest → oldest so a safety cap keeps recent traffic.
  for (let wi = windows.length - 1; wi >= 0; wi--) {
    if (opts.signal?.aborted) {
      return {
        rows: [],
        truncated: true,
        earliestCoveredDate: null,
        latestCoveredDate: null,
        error: { message: "aborted" },
        complete: false,
      };
    }

    const win = windows[wi];
    const chunkRows: T[] = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await opts.queryPage({
        gteIso: win.gteIso,
        ltIso: win.ltIso,
        from,
        to: from + pageSize - 1,
        signal: opts.signal,
      });
      if (error) {
        return {
          rows: [],
          truncated: false,
          earliestCoveredDate: null,
          latestCoveredDate: null,
          error,
          complete: false,
        };
      }
      const batch = (data ?? []) as T[];
      chunkRows.push(...batch);
      if (batch.length < pageSize) break;
      // Per-chunk safety against runaway paging
      if (chunkRows.length >= maxRows) {
        incomplete = true;
        break;
      }
    }

    collectedNewestFirst.push(...chunkRows);
    if (collectedNewestFirst.length >= maxRows) {
      truncatedByCap = true;
      // Older chunks would only add older rows — stop early.
      incomplete = incomplete || wi > 0;
      break;
    }
  }

  const capped = preferNewestCap(collectedNewestFirst, maxRows);
  return {
    ...capped,
    truncated: capped.truncated || truncatedByCap || incomplete,
    error: null,
    complete: !truncatedByCap && !incomplete && !capped.truncated,
  };
}

export type DailySeriesPoint = {
  date: string;
  visitors: number;
  sessions: number;
  rolling7: number | null;
};

/**
 * Build a daily visitors/sessions series.
 * When `truncated` is true, do not extend the series past the last fetched
 * date with zero-filled days (avoids a fake "no traffic" cliff).
 */
export function buildTrafficDailySeries(opts: {
  dailyVisitorSets: Map<string, Set<string>>;
  dailySessionSets: Map<string, Set<string>>;
  seriesStartKey: string;
  todayKey: string;
  firstPageViewDate: string | null;
  truncated: boolean;
  latestCoveredDate: string | null;
}): DailySeriesPoint[] {
  const endKey =
    opts.truncated && opts.latestCoveredDate
      ? opts.latestCoveredDate < opts.todayKey
        ? opts.latestCoveredDate
        : opts.todayKey
      : opts.todayKey;

  const daily: DailySeriesPoint[] = [];
  const visitorValues: number[] = [];

  for (const key of eachDateKeyInclusive(opts.seriesStartKey, endKey)) {
    if (opts.firstPageViewDate && key < opts.firstPageViewDate) continue;
    const visitors = opts.dailyVisitorSets.get(key)?.size ?? 0;
    const sessions = opts.dailySessionSets.get(key)?.size ?? 0;
    visitorValues.push(visitors);
    const window = visitorValues.slice(-7);
    const rolling7 =
      window.length >= 7
        ? Math.round((window.reduce((a, b) => a + b, 0) / window.length) * 10) /
          10
        : null;
    daily.push({ date: key, visitors, sessions, rolling7 });
  }
  return daily;
}
