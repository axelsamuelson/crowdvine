import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { TOP_100_WINES } from "@/lib/guides/top-100-wines";
import { mcpJsonResult } from "../utils/tool-result";
import {
  exactCi,
  findTop100ProducerExact,
  findTop100WineExact,
  ilikeContains,
  nearTop100ProducerMatches,
  nearTop100WineMatches,
} from "../utils/top-100-match";

const WINE_TYPE_VALUES = [
  ...new Set(TOP_100_WINES.map((w) => w.type)),
] as [string, ...string[]];

const wineTypeSchema = z.enum(WINE_TYPE_VALUES);

export function registerTop100Tools(server: McpServer) {
  server.registerTool(
    "get_top_100_producer",
    {
      description:
        "Exact lookup in TOP_100_PRODUCERS by name. On miss returns null match plus near_matches (never fuzzy-links).",
      inputSchema: {
        name: z.string().min(1).describe("Exact TopProducer.name"),
      },
    },
    async ({ name }) => {
      const trimmed = name.trim();
      const match = findTop100ProducerExact(trimmed);
      if (!match) {
        return mcpJsonResult(
          {
            match: null,
            near_matches: nearTop100ProducerMatches(trimmed),
          },
          { tool: "get_top_100_producer", rowCount: 0 },
        );
      }
      return mcpJsonResult(
        {
          rank: match.rank,
          name: match.name,
          region: match.region,
          country: match.country,
          grapes: match.grapes,
          description: match.description ?? null,
          descriptionEn: match.descriptionEn ?? null,
        },
        { tool: "get_top_100_producer", rowCount: 1 },
      );
    },
  );

  server.registerTool(
    "list_top_100_producers",
    {
      description:
        "List TOP_100_PRODUCERS sorted by rank. Descriptions omitted. Returns total and filtered counts.",
      inputSchema: {
        country: z
          .string()
          .optional()
          .describe("Exact country match, case-insensitive."),
        region: z.string().optional().describe("Ilike on region."),
        max_rank: z.number().int().positive().optional(),
        query: z.string().optional().describe("Ilike on producer name."),
      },
    },
    async ({ country, region, max_rank, query }) => {
      const total = TOP_100_PRODUCERS.length;
      let rows = [...TOP_100_PRODUCERS].sort((a, b) => a.rank - b.rank);

      if (country) {
        rows = rows.filter((p) => exactCi(p.country, country));
      }
      if (region) {
        rows = rows.filter((p) => ilikeContains(p.region, region));
      }
      if (max_rank != null) {
        rows = rows.filter((p) => p.rank <= max_rank);
      }
      if (query) {
        rows = rows.filter((p) => ilikeContains(p.name, query));
      }

      const entries = rows.map((p) => ({
        rank: p.rank,
        name: p.name,
        region: p.region,
        country: p.country,
        grapes: p.grapes,
      }));

      return mcpJsonResult(
        {
          total,
          filtered: entries.length,
          entries,
        },
        { tool: "list_top_100_producers", rowCount: entries.length },
      );
    },
  );

  server.registerTool(
    "get_top_100_wine",
    {
      description:
        "Exact lookup in TOP_100_WINES by wine name. Resolves top_100_producer via topProducerName (exact), falling back to exact match on producer.",
      inputSchema: {
        wine: z.string().min(1).describe("Exact TopWine.wine"),
      },
    },
    async ({ wine }) => {
      const trimmed = wine.trim();
      const match = findTop100WineExact(trimmed);
      if (!match) {
        return mcpJsonResult(
          {
            match: null,
            near_matches: nearTop100WineMatches(trimmed),
          },
          { tool: "get_top_100_wine", rowCount: 0 },
        );
      }

      const producer =
        (match.topProducerName
          ? findTop100ProducerExact(match.topProducerName)
          : null) ?? findTop100ProducerExact(match.producer);
      return mcpJsonResult(
        {
          rank: match.rank,
          wine: match.wine,
          producer: match.producer,
          topProducerName: match.topProducerName ?? null,
          region: match.region,
          country: match.country,
          type: match.type,
          grapes: match.grapes,
          description: match.description ?? null,
          descriptionEn: match.descriptionEn ?? null,
          top_100_producer: producer
            ? { rank: producer.rank, name: producer.name }
            : null,
        },
        { tool: "get_top_100_wine", rowCount: 1 },
      );
    },
  );

  server.registerTool(
    "list_top_100_wines",
    {
      description:
        "List TOP_100_WINES sorted by rank. Descriptions omitted. Type enum is derived from the source array.",
      inputSchema: {
        type: wineTypeSchema.optional(),
        country: z
          .string()
          .optional()
          .describe("Exact country match, case-insensitive."),
        region: z.string().optional().describe("Ilike on region."),
        producer: z.string().optional().describe("Ilike on free-text producer."),
        max_rank: z.number().int().positive().optional(),
        query: z
          .string()
          .optional()
          .describe("Ilike on wine name OR producer."),
      },
    },
    async ({ type, country, region, producer, max_rank, query }) => {
      const total = TOP_100_WINES.length;
      let rows = [...TOP_100_WINES].sort((a, b) => a.rank - b.rank);

      if (type) {
        rows = rows.filter((w) => exactCi(w.type, type));
      }
      if (country) {
        rows = rows.filter((w) => exactCi(w.country, country));
      }
      if (region) {
        rows = rows.filter((w) => ilikeContains(w.region, region));
      }
      if (producer) {
        rows = rows.filter((w) => ilikeContains(w.producer, producer));
      }
      if (max_rank != null) {
        rows = rows.filter((w) => w.rank <= max_rank);
      }
      if (query) {
        rows = rows.filter(
          (w) =>
            ilikeContains(w.wine, query) || ilikeContains(w.producer, query),
        );
      }

      const entries = rows.map((w) => ({
        rank: w.rank,
        wine: w.wine,
        producer: w.producer,
        region: w.region,
        country: w.country,
        type: w.type,
        grapes: w.grapes,
      }));

      return mcpJsonResult(
        {
          total,
          filtered: entries.length,
          entries,
        },
        { tool: "list_top_100_wines", rowCount: entries.length },
      );
    },
  );

  server.registerTool(
    "check_top_100_overlap",
    {
      description:
        "Diagnostic: TOP_100_WINES ↔ TOP_100_PRODUCERS via topProducerName (preferred) or exact producer match. Read-only.",
      inputSchema: {},
    },
    async () => {
      const unmatched: Array<{
        rank: number;
        wine: string;
        producer: string;
        near_matches: string[];
      }> = [];
      const missing_key: Array<{
        rank: number;
        wine: string;
        producer: string;
      }> = [];
      let exact_matches = 0;

      for (const wine of TOP_100_WINES) {
        const key = wine.topProducerName?.trim() || null;
        const resolved = key
          ? findTop100ProducerExact(key)
          : findTop100ProducerExact(wine.producer);

        if (resolved) {
          exact_matches += 1;
        } else {
          unmatched.push({
            rank: wine.rank,
            wine: wine.wine,
            producer: wine.producer,
            near_matches: nearTop100ProducerMatches(wine.producer),
          });
        }

        if (!key && !findTop100ProducerExact(wine.producer)) {
          missing_key.push({
            rank: wine.rank,
            wine: wine.wine,
            producer: wine.producer,
          });
        }
      }

      unmatched.sort((a, b) => a.rank - b.rank);
      missing_key.sort((a, b) => a.rank - b.rank);

      return mcpJsonResult(
        {
          exact_matches,
          unmatched_count: unmatched.length,
          unmatched,
          missing_key,
        },
        { tool: "check_top_100_overlap", rowCount: unmatched.length },
      );
    },
  );
}
