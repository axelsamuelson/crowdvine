import { beforeEach, describe, expect, it, vi } from "vitest";

const query = vi.fn();

vi.mock("googleapis", () => ({
  google: {
    auth: {
      GoogleAuth: class GoogleAuth {},
    },
    searchconsole: () => ({
      searchanalytics: { query },
    }),
  },
}));

import { fetchGscCompare, fetchGscPerformance } from "@/lib/gsc/performance";

type RequestBody = {
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  dimensionFilterGroups?: Array<{
    filters: Array<{
      dimension: string;
      operator: string;
      expression: string;
    }>;
  }>;
};

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDateUTC(d);
}

function inclusiveDayCount(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00.000Z`).getTime();
  const end = new Date(`${endIso}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / 86_400_000) + 1;
}

function requestBodies(): RequestBody[] {
  return query.mock.calls.map(
    (call) => (call[0] as { requestBody: RequestBody }).requestBody,
  );
}

function isProbe(body: RequestBody, today: string): boolean {
  return (
    body.dimensions?.[0] === "date" &&
    body.endDate === today &&
    body.startDate === addDaysUTC(today, -6) &&
    body.dimensionFilterGroups == null
  );
}

describe("GSC performance filters and data lag", () => {
  beforeEach(() => {
    process.env.GSC_SERVICE_ACCOUNT_KEY = JSON.stringify({
      client_email: "gsc@example.com",
      private_key: "test-key",
    });
    query.mockReset();
    query.mockImplementation(async (args: { requestBody: RequestBody }) => {
      const today = isoDateUTC(new Date());
      const body = args.requestBody;
      if (isProbe(body, today)) {
        const last = addDaysUTC(today, -2);
        return {
          data: {
            rows: [
              {
                keys: [addDaysUTC(last, -1)],
                clicks: 1,
                impressions: 5,
                ctr: 0.2,
                position: 8,
              },
              {
                keys: [last],
                clicks: 3,
                impressions: 9,
                ctr: 0.3,
                position: 6,
              },
            ],
          },
        };
      }
      const key = body.dimensions?.[0] ?? "total";
      return {
        data: {
          rows: [
            {
              keys: [key],
              clicks: 4,
              impressions: 20,
              ctr: 0.2,
              position: 3,
            },
          ],
        },
      };
    });
  });

  it("leaves filters off and ends an open range on the latest date with data", async () => {
    const today = isoDateUTC(new Date());
    const last = addDaysUTC(today, -2);
    const data = await fetchGscPerformance({ dimension: "query" });

    expect(data.last_data_date).toBe(last);
    expect(data.end_date).toBe(last);
    expect(data.start_date).toBe(addDaysUTC(last, -27));

    const bodies = requestBodies();
    const probe = bodies.find((body) => isProbe(body, today));
    const dataCalls = bodies.filter((body) => !isProbe(body, today));
    expect(probe).toBeTruthy();
    expect(probe?.dimensionFilterGroups).toBeUndefined();
    expect(dataCalls).toHaveLength(2);
    for (const body of dataCalls) {
      expect(body.dimensionFilterGroups).toBeUndefined();
      expect(body.startDate).toBe(data.start_date);
      expect(body.endDate).toBe(last);
    }
  });

  it("keeps an explicit end_date and still reports last_data_date", async () => {
    const today = isoDateUTC(new Date());
    const data = await fetchGscPerformance({
      start_date: "2026-10-21",
      end_date: "2026-11-01",
      page_filter: "/guides",
    });
    expect(data.start_date).toBe("2026-10-21");
    expect(data.end_date).toBe("2026-11-01");
    expect(data.last_data_date).toBe(addDaysUTC(today, -2));
    const filtered = requestBodies().filter(
      (body) => body.dimensionFilterGroups,
    );
    expect(filtered).toHaveLength(2);
    expect(filtered[0]?.dimensionFilterGroups).toEqual([
      {
        filters: [
          { dimension: "page", operator: "contains", expression: "/guides" },
        ],
      },
    ]);
  });

  it("ANDs page, country, and query filters in one group for any dimension", async () => {
    const data = await fetchGscPerformance({
      dimension: "query",
      country: "SWE",
      page_filter: " /vin ",
      query_filter: " pet nat ",
      start_date: "2026-10-21",
    });
    expect(data.dimension).toBe("query");
    expect(data.end_date).toBe(data.last_data_date);

    const grouped = requestBodies().filter(
      (body) => body.dimensions?.[0] === "query",
    );
    expect(grouped.length).toBeGreaterThan(0);
    for (const body of grouped) {
      expect(body.dimensionFilterGroups).toEqual([
        {
          filters: [
            { dimension: "page", operator: "contains", expression: "/vin" },
            { dimension: "country", operator: "equals", expression: "swe" },
            { dimension: "query", operator: "contains", expression: "pet nat" },
          ],
        },
      ]);
    }

    query.mockClear();
    await fetchGscPerformance({
      dimension: "page",
      country: "swe",
      query_filter: "pet nat",
      query_exact: true,
      start_date: "2026-10-21",
    });
    const pageCalls = requestBodies().filter(
      (body) => body.dimensions?.[0] === "page",
    );
    expect(pageCalls[0]?.dimensionFilterGroups?.[0]?.filters).toEqual([
      { dimension: "country", operator: "equals", expression: "swe" },
      { dimension: "query", operator: "equals", expression: "pet nat" },
    ]);
  });

  it("falls back to UTC today minus 3 days when the unfiltered probe is empty", async () => {
    const today = isoDateUTC(new Date());
    query.mockImplementation(async (args: { requestBody: RequestBody }) => {
      const body = args.requestBody;
      if (isProbe(body, today)) {
        return { data: { rows: [] } };
      }
      const key = body.dimensions?.[0] ?? "total";
      return {
        data: {
          rows: [
            {
              keys: [key],
              clicks: 1,
              impressions: 2,
              ctr: 0.5,
              position: 4,
            },
          ],
        },
      };
    });

    const data = await fetchGscPerformance({
      country: "swe",
      query_filter: "pet nat",
      page_filter: "/vin",
    });
    const fallback = addDaysUTC(today, -3);

    expect(data.last_data_date).toBe(fallback);
    expect(data.end_date).toBe(fallback);

    const probe = requestBodies().find((body) => isProbe(body, today));
    expect(probe?.dimensionFilterGroups).toBeUndefined();
    const filtered = requestBodies().filter(
      (body) => body.dimensionFilterGroups,
    );
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0]?.dimensionFilterGroups?.[0]?.filters).toEqual([
      { dimension: "page", operator: "contains", expression: "/vin" },
      { dimension: "country", operator: "equals", expression: "swe" },
      { dimension: "query", operator: "contains", expression: "pet nat" },
    ]);
  });

  it("rejects a country code that is not ISO 3166-1 alpha-3", async () => {
    await expect(fetchGscPerformance({ country: "sweden" })).rejects.toThrow(
      /ISO 3166-1 alpha-3/,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("ends compare periods on last_data_date with the same number of days", async () => {
    const today = isoDateUTC(new Date());
    const last = addDaysUTC(today, -2);
    const data = await fetchGscCompare({
      dimension: "query",
      country: "swe",
      period_days: 7,
      limit: 10,
    });

    expect(data.last_data_date).toBe(last);
    expect(data.current.end_date).toBe(last);
    expect(data.current.start_date).toBe(addDaysUTC(last, -6));
    expect(data.previous.end_date).toBe(
      addDaysUTC(data.current.start_date, -1),
    );
    expect(
      inclusiveDayCount(data.current.start_date, data.current.end_date),
    ).toBe(7);
    expect(
      inclusiveDayCount(data.previous.start_date, data.previous.end_date),
    ).toBe(7);

    const bodies = requestBodies();
    expect(bodies.some((body) => isProbe(body, today))).toBe(true);
    const periodCalls = bodies.filter(
      (body) => body.dimensions?.[0] === "query",
    );
    expect(periodCalls).toHaveLength(2);
    for (const body of periodCalls) {
      expect(body.dimensionFilterGroups).toEqual([
        {
          filters: [
            { dimension: "country", operator: "equals", expression: "swe" },
          ],
        },
      ]);
    }
    expect(periodCalls.map((body) => [body.startDate, body.endDate])).toEqual([
      [data.current.start_date, data.current.end_date],
      [data.previous.start_date, data.previous.end_date],
    ]);
  });
});
