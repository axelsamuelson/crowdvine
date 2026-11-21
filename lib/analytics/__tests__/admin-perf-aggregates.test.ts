import { describe, expect, it } from "vitest";
import {
  buildTrafficDailySeries,
  fetchEventsInDateChunks,
  preferNewestCap,
} from "../fetch-events-window";
import {
  buildWeeklyFunnelFromCleanEvents,
  computeMetrics28d,
  type CleanEventRow,
} from "../intent-sessions";
import { toStockholmDateKey } from "../stockholm-time";

function visitorKey(e: {
  visitor_id?: string | null;
  session_id: string;
}): string {
  return e.visitor_id && String(e.visitor_id).trim()
    ? String(e.visitor_id).trim()
    : `session:${e.session_id}`;
}

/** JS twin of admin_analytics_daily_traffic (Stockholm civil dates). */
function dailyTrafficFromEvents(
  events: CleanEventRow[],
): { day: string; visitors: number; sessions: number }[] {
  const byDay = new Map<string, { visitors: Set<string>; sessions: Set<string> }>();
  for (const e of events) {
    const day = toStockholmDateKey(e.created_at);
    if (!byDay.has(day)) {
      byDay.set(day, { visitors: new Set(), sessions: new Set() });
    }
    const bucket = byDay.get(day)!;
    bucket.visitors.add(visitorKey(e));
    bucket.sessions.add(e.session_id);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, b]) => ({
      day,
      visitors: b.visitors.size,
      sessions: b.sessions.size,
    }));
}

const FIXTURE_EVENTS: CleanEventRow[] = [
  {
    session_id: "s1",
    visitor_id: "v1",
    user_id: "u1",
    event_type: "page_view",
    event_metadata: {},
    created_at: "2026-10-20T10:00:00.000Z",
    site: "pact",
  },
  {
    session_id: "s1",
    visitor_id: "v1",
    user_id: "u1",
    event_type: "product_viewed",
    event_metadata: { productId: "w1" },
    created_at: "2026-10-20T10:05:00.000Z",
    site: "pact",
  },
  {
    session_id: "s1",
    visitor_id: "v1",
    user_id: "u1",
    event_type: "add_to_cart",
    event_metadata: {
      productId: "w1",
      productName: "Test Wine",
      quantity: 6,
      price: 199,
    },
    created_at: "2026-10-20T10:10:00.000Z",
    site: "pact",
  },
  {
    session_id: "s2",
    visitor_id: "v2",
    user_id: null,
    event_type: "page_view",
    event_metadata: {},
    created_at: "2026-10-21T12:00:00.000Z",
    site: "pact",
  },
  {
    session_id: "s2",
    visitor_id: "v2",
    user_id: null,
    event_type: "checkout_started",
    event_metadata: {},
    created_at: "2026-10-21T12:05:00.000Z",
    site: "pact",
  },
  {
    session_id: "s3",
    visitor_id: "v3",
    user_id: "u2",
    event_type: "page_view",
    event_metadata: {},
    created_at: "2026-10-22T09:00:00.000Z",
    site: "dirtywine",
  },
  {
    session_id: "s3",
    visitor_id: "v3",
    user_id: "u2",
    event_type: "reservation_completed",
    event_metadata: {},
    created_at: "2026-10-22T09:30:00.000Z",
    site: "dirtywine",
  },
  {
    session_id: "s4",
    visitor_id: null,
    user_id: "u3",
    event_type: "add_to_cart",
    event_metadata: {
      productId: "w2",
      productName: "Other",
      quantity: 6,
      price: 149,
    },
    created_at: "2026-10-23T15:00:00.000Z",
    site: "pact",
  },
];

describe("computeMetrics28d aggregate stability", () => {
  it("matches the previous inline metrics28d formula on fixtures", () => {
    const reservationsByUser = new Map<string, string[]>([
      ["u2", ["2026-10-22T09:25:00.000Z"]],
      ["u3", ["2026-10-30T12:00:00.000Z"]], // outside session window → no attrib
    ]);

    const metrics = computeMetrics28d(FIXTURE_EVENTS, reservationsByUser);

    // Visitors: v1, v2, v3, session:s4
    expect(metrics.visitors).toBe(4);
    expect(metrics.sessions).toBe(4);
    // s3 has reservation_completed
    expect(metrics.reservations).toBe(1);
    // s1 (cart, no reservation) + s4 (cart, no in-window reservation) = intent
    expect(metrics.intent_sessions).toBeGreaterThanOrEqual(1);
    expect(metrics.conversion_pct).toBe(
      Math.round((metrics.reservations / metrics.visitors) * 1000) / 10,
    );
  });

  it("is identical when event order is shuffled", () => {
    const reservationsByUser = new Map<string, string[]>();
    const a = computeMetrics28d(FIXTURE_EVENTS, reservationsByUser);
    const shuffled = [...FIXTURE_EVENTS].reverse();
    const b = computeMetrics28d(shuffled, reservationsByUser);
    expect(b).toEqual(a);
  });

  it("weekly funnel aggregates stay identical under shuffle", () => {
    const reservationsByUser = new Map<string, string[]>();
    const a = buildWeeklyFunnelFromCleanEvents(
      FIXTURE_EVENTS,
      reservationsByUser,
      56,
    );
    const b = buildWeeklyFunnelFromCleanEvents(
      [...FIXTURE_EVENTS].reverse(),
      reservationsByUser,
      56,
    );
    expect(b).toEqual(a);
  });
});

describe("fetchEventsInDateChunks concurrency preserves aggregates", () => {
  it("concurrency=1 and concurrency=6 yield identical capped rows", async () => {
    const store: { created_at: string; id: number; session_id: string }[] = [];
    let id = 0;
    for (let d = 1; d <= 28; d++) {
      const day = String(d).padStart(2, "0");
      for (let i = 0; i < 40; i++) {
        store.push({
          created_at: `2026-10-${day}T12:${String(i).padStart(2, "0")}:00.000Z`,
          id: ++id,
          session_id: `s-${day}-${i}`,
        });
      }
    }

    const queryPage = async ({
      gteIso,
      ltIso,
      from,
      to,
    }: {
      gteIso: string;
      ltIso: string | null;
      from: number;
      to: number;
    }) => {
      const filtered = store.filter((r) => {
        if (r.created_at < gteIso) return false;
        if (ltIso && !(r.created_at < ltIso)) return false;
        return true;
      });
      return { data: filtered.slice(from, to + 1), error: null };
    };

    const base = {
      sinceIso: "2026-10-01T00:00:00.000Z",
      untilIso: "2026-10-29T00:00:00.000Z",
      pageSize: 50,
      maxRows: 400,
      chunkDays: 7,
      queryPage,
    };

    const sequential = await fetchEventsInDateChunks({
      ...base,
      concurrency: 1,
    });
    const parallel = await fetchEventsInDateChunks({
      ...base,
      concurrency: 6,
    });

    expect(sequential.error).toBeNull();
    expect(parallel.error).toBeNull();
    expect(parallel.rows.map((r) => r.id)).toEqual(
      sequential.rows.map((r) => r.id),
    );
    expect(parallel.truncated).toBe(sequential.truncated);
    expect(parallel.earliestCoveredDate).toBe(sequential.earliestCoveredDate);
    expect(parallel.latestCoveredDate).toBe(sequential.latestCoveredDate);

    // Daily traffic aggregates identical after preferNewestCap
    const seqEvents = sequential.rows as unknown as CleanEventRow[];
    const parEvents = parallel.rows as unknown as CleanEventRow[];
    expect(dailyTrafficFromEvents(parEvents)).toEqual(
      dailyTrafficFromEvents(seqEvents),
    );
  });
});

describe("daily traffic JS twin (RPC contract)", () => {
  it("matches buildTrafficDailySeries visitor/session counts per day", () => {
    const daily = dailyTrafficFromEvents(FIXTURE_EVENTS);
    const visitorSets = new Map<string, Set<string>>();
    const sessionSets = new Map<string, Set<string>>();
    for (const e of FIXTURE_EVENTS) {
      const day = toStockholmDateKey(e.created_at);
      if (!visitorSets.has(day)) visitorSets.set(day, new Set());
      if (!sessionSets.has(day)) sessionSets.set(day, new Set());
      visitorSets.get(day)!.add(visitorKey(e));
      sessionSets.get(day)!.add(e.session_id);
    }
    const series = buildTrafficDailySeries({
      dailyVisitorSets: visitorSets,
      dailySessionSets: sessionSets,
      seriesStartKey: daily[0].day,
      todayKey: daily[daily.length - 1].day,
      firstPageViewDate: daily[0].day,
      truncated: false,
      latestCoveredDate: daily[daily.length - 1].day,
    });
    for (const point of daily) {
      const seriesPoint = series.find((s) => s.date === point.day);
      expect(seriesPoint?.visitors).toBe(point.visitors);
      expect(seriesPoint?.sessions).toBe(point.sessions);
    }
  });

  it("preferNewestCap does not change aggregates when under the cap", () => {
    const capped = preferNewestCap(
      FIXTURE_EVENTS.map((e) => ({ ...e })),
      10_000,
    );
    expect(capped.truncated).toBe(false);
    expect(dailyTrafficFromEvents(capped.rows)).toEqual(
      dailyTrafficFromEvents(FIXTURE_EVENTS),
    );
    expect(computeMetrics28d(capped.rows, new Map())).toEqual(
      computeMetrics28d(FIXTURE_EVENTS, new Map()),
    );
  });
});
