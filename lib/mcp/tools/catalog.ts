import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { catalogApiJson } from "@/lib/catalog-api-fetch";
import {
  CATALOG_CERTIFICATION_VALUES,
  CATALOG_WINE_TYPE_VALUES,
} from "@/lib/catalog-types";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

const certificationSchema = z.enum(CATALOG_CERTIFICATION_VALUES);
const wineTypeSchema = z.enum(CATALOG_WINE_TYPE_VALUES);

/** Fields that map to PDP content (hero, specs grid, enrichment dropdowns). */
const winePdpContentFields = {
  summary: z
    .string()
    .optional()
    .describe("PDP hero — kort sammanfattning i vit box."),
  description: z
    .string()
    .optional()
    .describe("PDP hero — fallback om summary saknas."),
  color: z
    .string()
    .optional()
    .describe(
      "PDP specs Färg. Admin-värden: Red, White, Rose, Orange, Red & Orange, … (eller type: red/white/rosé).",
    ),
  grape_varieties: z
    .array(z.string())
    .optional()
    .describe("PDP specs Druvsort."),
  appellation: z.string().optional().describe("PDP specs Appellation."),
  farming: certificationSchema
    .optional()
    .describe("PDP specs Odling (organic_certified, natural, …)."),
  additives: z
    .string()
    .optional()
    .describe("PDP specs Tillsatser — visas med farming."),
  alcohol_pct: z.number().optional().describe("PDP specs Alkohol (%)."),
  abv: z
    .string()
    .optional()
    .describe('PDP specs Alkohol som text, t.ex. "13.5 %".'),
  serving_temp_c: z
    .string()
    .optional()
    .describe("PDP specs Serveringstemperatur."),
  elevation_masl: z
    .number()
    .int()
    .optional()
    .describe("PDP specs Höjd (m ö.h.)."),
  soil_type: z.string().optional().describe("PDP specs Jordtyp."),
  tasting_notes: z
    .string()
    .optional()
    .describe("PDP dropdown Smaknoter."),
  food_pairing: z
    .array(z.string())
    .optional()
    .describe("PDP dropdown Passar till."),
  ageing: z.string().optional().describe("PDP dropdown Lagring / elevage."),
  winemaker_notes: z
    .string()
    .optional()
    .describe("PDP dropdown Producentens noteringar."),
  awards: z.array(z.string()).optional().describe("PDP dropdown Utmärkelser."),
} as const;

async function catalogGet<T>(
  path: string,
  tool: string,
): Promise<ReturnType<typeof mcpJsonResult> | ReturnType<typeof mcpErrorResult>> {
  const res = await catalogApiJson<T>(path, { method: "GET" });
  if (!res.ok) return mcpErrorResult(res.error, tool);
  return mcpJsonResult(res.data, { tool });
}

export function registerCatalogTools(server: McpServer, sb: SupabaseClient) {
  void sb;

  server.registerTool(
    "list_producers",
    {
      description: "Lista alla catalog-producenter (sorterade på namn).",
      inputSchema: {},
    },
    async () => {
      try {
        const res = await catalogApiJson<{ producers: unknown[] }>(
          "/api/producers",
          { method: "GET" },
        );
        if (!res.ok) return mcpErrorResult(res.error, "list_producers");
        const rows = res.data.producers ?? [];
        return mcpJsonResult(rows, {
          tool: "list_producers",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_producers",
        );
      }
    },
  );

  server.registerTool(
    "get_producer",
    {
      description: "Hämta en catalog-producent via id.",
      inputSchema: {
        id: z.string().describe("Producer UUID"),
      },
    },
    async ({ id }) => {
      try {
        return catalogGet(`/api/producers/${encodeURIComponent(id)}`, "get_producer");
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_producer",
        );
      }
    },
  );

  server.registerTool(
    "create_producer",
    {
      description:
        "Skapa catalog-producent. Kräver name, region; country default France.",
      inputSchema: {
        name: z.string(),
        region: z.string(),
        country: z.string().optional(),
        subregion: z.string().optional(),
        founded_year: z.number().int().optional(),
        bio_short: z.string().optional(),
        bio_long: z.string().optional(),
        certification: certificationSchema.optional(),
        contact_name: z.string().optional(),
        contact_email: z.string().optional(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "create_producer",
        args as Record<string, unknown>,
        async () => {
          const res = await catalogApiJson("/api/producers", {
            method: "POST",
            body: JSON.stringify(args),
          });
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
      );
    },
  );

  server.registerTool(
    "update_producer",
    {
      description: "Uppdatera catalog-producent (partial update).",
      inputSchema: {
        id: z.string(),
        name: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        subregion: z.string().nullable().optional(),
        founded_year: z.number().int().nullable().optional(),
        bio_short: z.string().nullable().optional(),
        bio_long: z.string().nullable().optional(),
        certification: certificationSchema.nullable().optional(),
        contact_name: z.string().nullable().optional(),
        contact_email: z.string().nullable().optional(),
      },
    },
    async (args) => {
      const { id, ...body } = args;
      return mcpWriteTool(
        sb,
        "update_producer",
        args as Record<string, unknown>,
        async () => {
          const res = await catalogApiJson(
            `/api/producers/${encodeURIComponent(id)}`,
            {
              method: "PATCH",
              body: JSON.stringify(body),
            },
          );
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
      );
    },
  );

  server.registerTool(
    "list_wines",
    {
      description:
        "Lista catalog-viner. Filtrera på producer_id, type, is_published.",
      inputSchema: {
        producer_id: z.string().optional(),
        type: wineTypeSchema.optional(),
        is_published: z.boolean().optional(),
      },
    },
    async ({ producer_id, type, is_published }) => {
      try {
        const params = new URLSearchParams();
        if (producer_id) params.set("producer_id", producer_id);
        if (type) params.set("type", type);
        if (is_published !== undefined) {
          params.set("is_published", String(is_published));
        }
        const qs = params.toString();
        const path = qs ? `/api/wines?${qs}` : "/api/wines";
        const res = await catalogApiJson<{ wines: unknown[] }>(path, {
          method: "GET",
        });
        if (!res.ok) return mcpErrorResult(res.error, "list_wines");
        const rows = res.data.wines ?? [];
        return mcpJsonResult(rows, {
          tool: "list_wines",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_wines",
        );
      }
    },
  );

  server.registerTool(
    "get_wine",
    {
      description: "Hämta ett catalog-vin via id.",
      inputSchema: {
        id: z.string(),
      },
    },
    async ({ id }) => {
      try {
        return catalogGet(`/api/wines/${encodeURIComponent(id)}`, "get_wine");
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_wine",
        );
      }
    },
  );

  server.registerTool(
    "create_wine",
    {
      description:
        "Skapa vin i catalog (public.wines). Stödjer alla PDP-innehållsfält: summary, specs-rutor, smaknoter och expanderbara sektioner. Kräver producer_id, name, appellation, type eller color, price_sek.",
      inputSchema: {
        producer_id: z.string(),
        name: z.string(),
        appellation: z.string(),
        type: wineTypeSchema.optional(),
        price_sek: z.number().int().nonnegative(),
        vintage: z.number().int().nullable().optional(),
        bottle_size_ml: z.number().int().optional(),
        import_price_eur: z.number().optional(),
        yield_hl_ha: z.number().optional(),
        is_published: z.boolean().optional(),
        locale: z.enum(["sv", "en"]).default("sv").optional(),
        ...winePdpContentFields,
      },
    },
    async (args) => {
      const { locale = "sv", ...wineArgs } = args;
      return mcpWriteTool(
        sb,
        "create_wine",
        args as Record<string, unknown>,
        async () => {
          const res = await catalogApiJson("/api/wines", {
            method: "POST",
            body: JSON.stringify(wineArgs),
            headers: {
              "x-pact-locale": locale,
            },
          });
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
      );
    },
  );

  server.registerTool(
    "update_wine",
    {
      description:
        "Uppdatera vin (partial). Alla PDP-innehållsfält kan sättas — se create_wine för fältbeskrivningar.",
      inputSchema: {
        id: z.string(),
        producer_id: z.string().optional(),
        name: z.string().optional(),
        vintage: z.number().int().nullable().optional(),
        type: wineTypeSchema.optional(),
        price_sek: z.number().int().optional(),
        bottle_size_ml: z.number().int().optional(),
        import_price_eur: z.number().nullable().optional(),
        yield_hl_ha: z.number().nullable().optional(),
        is_published: z.boolean().optional(),
        summary: winePdpContentFields.summary.nullable().optional(),
        description: winePdpContentFields.description.nullable().optional(),
        color: winePdpContentFields.color.nullable().optional(),
        grape_varieties: winePdpContentFields.grape_varieties.optional(),
        appellation: winePdpContentFields.appellation.optional(),
        farming: certificationSchema.nullable().optional(),
        additives: winePdpContentFields.additives.nullable().optional(),
        alcohol_pct: z.number().nullable().optional(),
        abv: winePdpContentFields.abv.nullable().optional(),
        serving_temp_c: winePdpContentFields.serving_temp_c.nullable().optional(),
        elevation_masl: winePdpContentFields.elevation_masl.nullable().optional(),
        soil_type: winePdpContentFields.soil_type.nullable().optional(),
        tasting_notes: winePdpContentFields.tasting_notes.nullable().optional(),
        food_pairing: winePdpContentFields.food_pairing.optional(),
        ageing: winePdpContentFields.ageing.nullable().optional(),
        winemaker_notes: winePdpContentFields.winemaker_notes.nullable().optional(),
        awards: winePdpContentFields.awards.optional(),
        locale: z.enum(["sv", "en"]).default("sv").optional(),
      },
    },
    async (args) => {
      const { id, locale = "sv", ...body } = args;
      return mcpWriteTool(
        sb,
        "update_wine",
        args as Record<string, unknown>,
        async () => {
          const res = await catalogApiJson(`/api/wines/${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify(body),
            headers: {
              "x-pact-locale": locale,
            },
          });
          if (!res.ok) throw new Error(res.error);
          return res.data;
        },
      );
    },
  );
}
