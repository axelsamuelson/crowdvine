import { describe, expect, it } from "vitest";
import {
  buildTrafficDailySeries,
  fetchEventsInDateChunks,
  preferNewestCap,
  stockholmDateChunkWindows,
} from "../fetch-events-window";

describe("preferNewestCap", () => {
  it("does not truncate when under the cap", () => {
    const rows = [
      { created_at: "2026-11-01T10:00:00.000Z", id: 1 },
      { created_at: "2026-11-02T10:00:00.000Z", id: 2 },
    ];
    const result = preferNewestCap(rows, 10);
    expect(result.truncated).toBe(false);
    expect(result.rows.map((r) => r.id)).toEqual([1, 2]);
    expect(result.earliestCoveredDate).toBe("2026-11-01");
    expect(result.latestCoveredDate).toBe("2026-11-02");
  });

  it("never drops the newest days when the cap is hit", () => {
    const rows = [];
    for (let d = 1; d <= 10; d++) {
      const day = String(d).padStart(2, "0");
      for (let i = 0; i < 100; i++) {
        rows.push({
          created_at: `2026-11-${day}T12:${String(i % 60).padStart(2, "0")}:00.000Z`,
          day: `2026-11-${day}`,
        });
      }
    }
    // 1000 rows across Nov 1–10; keep 250 → newest 2.5 days
    const result = preferNewestCap(rows, 250);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(250);
    const days = [...new Set(result.rows.map((r) => r.day))].sort();
    expect(days[days.length - 1]).toBe("2026-11-10");
    expect(days).not.toContain("2026-11-01");
    expect(result.latestCoveredDate).toBe("2026-11-10");
    expect(result.earliestCoveredDate).toBeTruthy();
    expect(result.earliestCoveredDate! >= "2026-11-08").toBe(true);
  });

  it("sets truncated when cap is hit even if all rows share one day", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      created_at: `2026-11-13T0${i}:00:00.000Z`,
    }));
    const result = preferNewestCap(rows, 3);
    expect(result.truncated).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].created_at).toBe("2026-11-13T02:00:00.000Z");
    expect(result.rows[2].created_at).toBe("2026-11-13T04:00:00.000Z");
  });
});

describe("buildTrafficDailySeries", () => {
  it("zero-fills through today when not truncated", () => {
    const visitors = new Map<string, Set<string>>([
      ["2026-11-10", new Set(["a"])],
    ]);
    const sessions = new Map<string, Set<string>>([
      ["2026-11-10", new Set(["s1"])],
    ]);
    const daily = buildTrafficDailySeries({
      dailyVisitorSets: visitors,
      dailySessionSets: sessions,
      seriesStartKey: "2026-11-10",
      todayKey: "2026-11-13",
      firstPageViewDate: "2026-11-10",
      truncated: false,
      latestCoveredDate: "2026-11-10",
    });
    expect(daily.map((d) => d.date)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
    ]);
    expect(daily[1].visitors).toBe(0);
  });

  it("does not zero-fill days after the last fetched row when truncated", () => {
    const visitors = new Map<string, Set<string>>([
      ["2026-11-01", new Set(["a"])],
      ["2026-11-03", new Set(["b"])],
    ]);
    const sessions = new Map<string, Set<string>>([
      ["2026-11-01", new Set(["s1"])],
      ["2026-11-03", new Set(["s2"])],
    ]);
    const daily = buildTrafficDailySeries({
      dailyVisitorSets: visitors,
      dailySessionSets: sessions,
      seriesStartKey: "2026-11-01",
      todayKey: "2026-11-13",
      firstPageViewDate: "2026-11-01",
      truncated: true,
      latestCoveredDate: "2026-11-03",
    });
    expect(daily.map((d) => d.date)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(daily.some((d) => d.date === "2026-11-04")).toBe(false);
  });
});

describe("stockholmDateChunkWindows", () => {
  it("covers the range without gaps", () => {
    const windows = stockholmDateChunkWindows(
      "2026-11-01T00:00:00.000Z",
      "2026-11-15T00:00:00.000Z",
      7,
    );
    expect(windows.length).toBeGreaterThan(1);
    expect(windows[0].gteIso).toBe("2026-11-01T00:00:00.000Z");
    expect(windows[windows.length - 1].ltIso).toBe("2026-11-15T00:00:00.000Z");
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i].gteIso).toBe(windows[i - 1].ltIso);
    }
  });
});

describe("fetchEventsInDateChunks", () => {
  it("pages chunks newest-first and flags truncation when capped", async () => {
    const store: { created_at: string; id: number }[] = [];
    let id = 0;
    // ~30 days × 100 rows = 3000; cap at 500 → keep newest ~5 days
    for (let d = 1; d <= 30; d++) {
      const day = String(d).padStart(2, "0");
      for (let i = 0; i < 100; i++) {
        const minute = String(Math.floor(i / 2)).padStart(2, "0");
        const second = String((i % 2) * 30).padStart(2, "0");
        store.push({
          created_at: `2026-10-${day}T12:${minute}:${second}.000Z`,
          id: ++id,
        });
      }
    }

    const result = await fetchEventsInDateChunks({
      sinceIso: "2026-10-01T00:00:00.000Z",
      untilIso: "2026-10-31T00:00:00.000Z",
      pageSize: 100,
      maxRows: 500,
      chunkDays: 7,
      queryPage: async ({ gteIso, ltIso, from, to }) => {
        const filtered = store.filter((r) => {
          if (r.created_at < gteIso) return false;
          if (ltIso && !(r.created_at < ltIso)) return false;
          return true;
        });
        return { data: filtered.slice(from, to + 1), error: null };
      },
    });

    expect(result.error).toBeNull();
    expect(result.truncated).toBe(true);
    expect(result.rows.length).toBe(500);
    expect(result.latestCoveredDate).toBe("2026-10-30");
    expect(result.earliestCoveredDate).toBeTruthy();
    // Newest days kept — Oct 30 present; early October dropped
    expect(
      result.rows.some((r) => r.created_at.startsWith("2026-10-30")),
    ).toBe(true);
    expect(
      result.rows.some((r) => r.created_at.startsWith("2026-10-01")),
    ).toBe(false);
  });
});
