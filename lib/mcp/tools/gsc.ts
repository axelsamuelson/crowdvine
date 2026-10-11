import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  fetchGscCompare,
  fetchGscPerformance,
} from "@/lib/gsc/performance";
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
