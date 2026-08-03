import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { google } from "googleapis";
import { z } from "zod";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** Matches analytics_site() naming. */
export const GSC_SITE_PROPERTIES = {
  pact: "sc-domain:pactwines.com",
  dirtywine: "sc-domain:dirtywine.se",
} as const;

export type GscSite = keyof typeof GSC_SITE_PROPERTIES;

const siteSchema = z.enum(["pact", "dirtywine"]).default("pact");
const performanceDimensionSchema = z
  .enum(["query", "page", "date", "country", "device"])
  .default("query");
const compareDimensionSchema = z.enum(["query", "page"]).default("query");

type GscApiRow = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

function isoDateUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUTC(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDateUTC(d);
}

/** Inclusive last `days` ending on `endIso` (UTC). */
function startForInclusiveDays(endIso: string, days: number): string {
  return addDaysUTC(endIso, -(days - 1));
}

function defaultEndDate(): string {
  return isoDateUTC(new Date());
}

function getStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as {
    code?: number | string;
    response?: { status?: number };
    status?: number;
  };
  if (typeof e.response?.status === "number") return e.response.status;
  if (typeof e.status === "number") return e.status;
  if (typeof e.code === "number") return e.code;
  if (typeof e.code === "string" && /^\d+$/.test(e.code)) {
    return Number(e.code);
  }
  return undefined;
}

function mapGscError(err: unknown, site: GscSite, property: string): string {
  const status = getStatusCode(err);
  if (site === "dirtywine" && (status === 403 || status === 404)) {
    return "Search Console-property saknas eller service-accountet har inte åtkomst för dirtywine.se";
  }
  if (status === 403) {
    return `Service-accountet saknar åtkomst till Search Console-property ${property}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function requireServiceAccountKey(): string {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new Error("Missing env GSC_SERVICE_ACCOUNT_KEY");
  }
  return raw;
}

function getSearchConsoleClient() {
  const raw = requireServiceAccountKey();
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "GSC_SERVICE_ACCOUNT_KEY is not valid JSON — expected the full service account key object",
    );
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [GSC_SCOPE],
  });
  return google.searchconsole({ version: "v1", auth });
}

async function querySearchAnalytics(params: {
  site: GscSite;
  startDate: string;
  endDate: string;
  dimensions?: string[];
  rowLimit?: number;
  pageFilter?: string;
}): Promise<{ property: string; rows: GscApiRow[] }> {
  const property = GSC_SITE_PROPERTIES[params.site];
  const client = getSearchConsoleClient();

  const dimensionFilterGroups = params.pageFilter?.trim()
    ? [
        {
          filters: [
            {
              dimension: "page",
              operator: "contains",
              expression: params.pageFilter.trim(),
            },
          ],
        },
      ]
    : undefined;

  try {
    const res = await client.searchanalytics.query({
      siteUrl: property,
      requestBody: {
        startDate: params.startDate,
        endDate: params.endDate,
        dimensions: params.dimensions,
        rowLimit: params.rowLimit,
        dimensionFilterGroups,
      },
    });
    return { property, rows: (res.data.rows ?? []) as GscApiRow[] };
  } catch (err) {
    throw new Error(mapGscError(err, params.site, property));
  }
}

function mapPerformanceRows(rows: GscApiRow[]) {
  return rows
    .map((r) => ({
      key: (r.keys ?? []).join(" / ") || "(unknown)",
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      ctr: Number(r.ctr ?? 0),
      position: Number(r.position ?? 0),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

function sumTotals(rows: GscApiRow[]) {
  const clicks = rows.reduce((acc, r) => acc + Number(r.clicks ?? 0), 0);
  const impressions = rows.reduce(
    (acc, r) => acc + Number(r.impressions ?? 0),
    0,
  );
  const ctr = impressions > 0 ? clicks / impressions : 0;
  // Impression-weighted average position when possible
  let positionWeighted = 0;
  let weight = 0;
  for (const r of rows) {
    const imps = Number(r.impressions ?? 0);
    const pos = Number(r.position ?? 0);
    if (imps > 0) {
      positionWeighted += pos * imps;
      weight += imps;
    }
  }
  return {
    clicks,
    impressions,
    ctr,
    position: weight > 0 ? positionWeighted / weight : 0,
  };
}

export async function fetchGscPerformance(input: {
  site?: GscSite;
  start_date?: string;
  end_date?: string;
  dimension?: "query" | "page" | "date" | "country" | "device";
  limit?: number;
  page_filter?: string;
}) {
  const site = input.site ?? "pact";
  const end_date = input.end_date ?? defaultEndDate();
  const start_date =
    input.start_date ?? startForInclusiveDays(end_date, 28);
  const dimension = input.dimension ?? "query";
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 250);

  const [dimensioned, totalsRaw] = await Promise.all([
    querySearchAnalytics({
      site,
      startDate: start_date,
      endDate: end_date,
      dimensions: [dimension],
      rowLimit: limit,
      pageFilter: input.page_filter,
    }),
    querySearchAnalytics({
      site,
      startDate: start_date,
      endDate: end_date,
      rowLimit: 1,
      pageFilter: input.page_filter,
    }),
  ]);

  const rows = mapPerformanceRows(dimensioned.rows).slice(0, limit);
  const totals =
    totalsRaw.rows.length > 0
      ? sumTotals(totalsRaw.rows)
      : { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  return {
    site,
    property: dimensioned.property,
    start_date,
    end_date,
    dimension,
    totals,
    rows,
  };
}

export async function fetchGscCompare(input: {
  site?: GscSite;
  dimension?: "query" | "page";
  period_days?: number;
  limit?: number;
}) {
  const site = input.site ?? "pact";
  const dimension = input.dimension ?? "query";
  const period_days = Math.max(input.period_days ?? 28, 1);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 250);

  const current_end = defaultEndDate();
  const current_start = startForInclusiveDays(current_end, period_days);
  const previous_end = addDaysUTC(current_start, -1);
  const previous_start = startForInclusiveDays(previous_end, period_days);

  // Fetch more than limit so deltas aren't biased by top-N-only each side
  const fetchLimit = Math.min(limit * 4, 250);

  const [current, previous] = await Promise.all([
    querySearchAnalytics({
      site,
      startDate: current_start,
      endDate: current_end,
      dimensions: [dimension],
      rowLimit: fetchLimit,
    }),
    querySearchAnalytics({
      site,
      startDate: previous_start,
      endDate: previous_end,
      dimensions: [dimension],
      rowLimit: fetchLimit,
    }),
  ]);

  type Agg = {
    clicks: number;
    impressions: number;
    position: number;
    positionWeight: number;
  };
  const curMap = new Map<string, Agg>();
  const prevMap = new Map<string, Agg>();

  const ingest = (target: Map<string, Agg>, rows: GscApiRow[]) => {
    for (const r of rows) {
      const key = (r.keys ?? []).join(" / ") || "(unknown)";
      const clicks = Number(r.clicks ?? 0);
      const impressions = Number(r.impressions ?? 0);
      const position = Number(r.position ?? 0);
      const existing = target.get(key);
      if (!existing) {
        target.set(key, {
          clicks,
          impressions,
          position,
          positionWeight: impressions,
        });
      } else {
        existing.clicks += clicks;
        existing.impressions += impressions;
        existing.positionWeight += impressions;
        // Keep last reported position as fallback; weighted at end
        existing.position = position;
      }
    }
  };
  ingest(curMap, current.rows);
  ingest(prevMap, previous.rows);

  const keys = new Set([...curMap.keys(), ...prevMap.keys()]);
  const rows = [...keys]
    .map((key) => {
      const c = curMap.get(key);
      const p = prevMap.get(key);
      const clicks = c?.clicks ?? 0;
      const clicks_prev = p?.clicks ?? 0;
      const impressions = c?.impressions ?? 0;
      const impressions_prev = p?.impressions ?? 0;
      const position =
        c && c.positionWeight > 0
          ? // Re-derive from stored position when weight matches single row
            c.position
          : (c?.position ?? 0);
      const position_prev = p?.position ?? 0;
      return {
        key,
        clicks,
        clicks_prev,
        clicks_delta: clicks - clicks_prev,
        impressions,
        impressions_prev,
        position,
        position_prev,
      };
    })
    .sort((a, b) => Math.abs(b.clicks_delta) - Math.abs(a.clicks_delta))
    .slice(0, limit);

  return {
    site,
    property: current.property,
    dimension,
    period_days,
    current: { start_date: current_start, end_date: current_end },
    previous: { start_date: previous_start, end_date: previous_end },
    rows,
  };
}

export function registerGscTools(server: McpServer) {
  server.registerTool(
    "get_gsc_performance",
    {
      description:
        "Hämta Google Search Console-prestanda (klick, impressions, CTR, position) per dimension för PACT eller Dirty Wine. Default: senaste 28 dagarna, dimension=query.",
      inputSchema: z.object({
        site: siteSchema.describe("pact eller dirtywine (default pact)"),
        start_date: z
          .string()
          .optional()
          .describe("ISO YYYY-MM-DD (default: end_date − 27 dagar)"),
        end_date: z
          .string()
          .optional()
          .describe("ISO YYYY-MM-DD (default: idag UTC)"),
        dimension: performanceDimensionSchema.describe(
          "query | page | date | country | device",
        ),
        limit: z
          .number()
          .int()
          .min(1)
          .max(250)
          .optional()
          .describe("Max rader (default 25, max 250)"),
        page_filter: z
          .string()
          .optional()
          .describe("Valfri substring-match på page-URL"),
      }),
    },
    async (args) => {
      try {
        const data = await fetchGscPerformance(args);
        return mcpJsonResult(data, {
          tool: "get_gsc_performance",
          rowCount: data.rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_gsc_performance",
        );
      }
    },
  );

  server.registerTool(
    "get_gsc_compare",
    {
      description:
        "Jämför Google Search Console senaste N dagar vs föregående N dagar (klick-delta) per query eller page.",
      inputSchema: z.object({
        site: siteSchema.describe("pact eller dirtywine (default pact)"),
        dimension: compareDimensionSchema.describe("query eller page"),
        period_days: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("Antal dagar per period (default 28)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(250)
          .optional()
          .describe("Max rader (default 25, max 250)"),
      }),
    },
    async (args) => {
      try {
        const data = await fetchGscCompare(args);
        return mcpJsonResult(data, {
          tool: "get_gsc_compare",
          rowCount: data.rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_gsc_compare",
        );
      }
    },
  );
}
