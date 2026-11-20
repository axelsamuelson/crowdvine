import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { fetchGscCompare, fetchGscPerformance } from "@/lib/gsc/performance";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";

export {
  GSC_SITE_PROPERTIES,
  fetchGscCompare,
  fetchGscPerformance,
  type GscSite,
} from "@/lib/gsc/performance";

const siteSchema = z.enum(["pact", "dirtywine"]).default("pact");
const performanceDimensionSchema = z
  .enum(["query", "page", "date", "country", "device"])
  .default("query");
const compareDimensionSchema = z.enum(["query", "page"]).default("query");

const countrySchema = z
  .string()
  .regex(/^[a-z]{3}$/, "ISO 3166-1 alpha-3 lowercase, e.g. swe")
  .optional()
  .describe(
    "Land, ISO 3166-1 alpha-3 i gemener (t.ex. swe). equals-filter. AND tillsammans med page_filter och query_filter, oavsett dimension.",
  );
const queryFilterSchema = z
  .string()
  .optional()
  .describe(
    "Filter på sökfrågan. Operator contains, eller equals om query_exact är true. AND tillsammans med övriga filter.",
  );
const queryExactSchema = z
  .boolean()
  .optional()
  .describe(
    "Om true används equals för query_filter i stället för contains (default false).",
  );
const pageFilterSchema = z
  .string()
  .optional()
  .describe(
    "Valfri substring-match på page-URL (operator contains). AND tillsammans med country och query_filter.",
  );

export type RegisterGscToolsOptions = {
  /** When set, only register tools present in the set. */
  allowlist?: ReadonlySet<string>;
};

export function registerGscTools(
  server: McpServer,
  opts?: RegisterGscToolsOptions,
) {
  const allow = opts?.allowlist;
  const allowTool = (name: string) => !allow || allow.has(name);

  if (allowTool("get_gsc_performance")) {
    server.registerTool(
      "get_gsc_performance",
      {
        description:
          "Hämta Google Search Console-prestanda (klick, impressions, CTR, position) per dimension för PACT eller Dirty Wine. Default: senaste 28 dagarna t.o.m. senaste datum med data (GSC släpar 2–3 dagar; svaret innehåller last_data_date), dimension=query. page_filter, country och query_filter kombineras med AND i en filtergrupp och fungerar tillsammans med valfri dimension, inklusive dimension=query.",
        inputSchema: z.object({
          site: siteSchema.describe("pact eller dirtywine (default pact)"),
          start_date: z
            .string()
            .optional()
            .describe("ISO YYYY-MM-DD (default: end_date − 27 dagar)"),
          end_date: z
            .string()
            .optional()
            .describe(
              "ISO YYYY-MM-DD (default: last_data_date, senaste datum med data — inte idag)",
            ),
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
          page_filter: pageFilterSchema,
          country: countrySchema,
          query_filter: queryFilterSchema,
          query_exact: queryExactSchema,
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
  }

  if (allowTool("get_gsc_compare")) {
    server.registerTool(
      "get_gsc_compare",
      {
        description:
          "Jämför Google Search Console senaste N dagar med data mot föregående N dagar (klick-delta) per query eller page. Båda perioderna slutar så att current.end_date är last_data_date (inte idag) och previous slutar dagen före current börjar. Lika många dagar i båda. page_filter, country och query_filter kombineras med AND och fungerar tillsammans med dimensionen.",
        inputSchema: z.object({
          site: siteSchema.describe("pact eller dirtywine (default pact)"),
          dimension: compareDimensionSchema.describe("query eller page"),
          period_days: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe(
              "Antal dagar per period (default 28). Current slutar på last_data_date.",
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(250)
            .optional()
            .describe("Max rader (default 25, max 250)"),
          page_filter: pageFilterSchema,
          country: countrySchema,
          query_filter: queryFilterSchema,
          query_exact: queryExactSchema,
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
}
