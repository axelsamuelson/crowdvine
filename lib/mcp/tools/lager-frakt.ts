import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  getGeoZone,
  getPickupZone,
  getShippingRegion,
  listCustomerShippingRates,
  listFreightCatalogue,
  listGeoZones,
  listPalletFreightQuotes,
  listPickupZonesWithStats,
  listShippingRegions,
  previewOutboundFreight,
} from "@/lib/admin/lager-frakt-reads";
import { loadB2bPalletStatusOverview } from "@/lib/b2b-pallet-status-overview-data";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";

export function registerLagerFraktReadTools(
  server: McpServer,
  sb: SupabaseClient,
) {
  server.registerTool(
    "list_geo_zones",
    {
      description:
        "Lista vinzoner (geo_zones) med kopplad leveranszon. eligibility_status och is_active styr om zonen syns i kundcheckout — läsverktyg ändrar inget.",
      inputSchema: {
        market_code: z
          .string()
          .optional()
          .describe("Valfritt filter, t.ex. EU eller US."),
      },
    },
    async ({ market_code }) => {
      try {
        const geoZones = await listGeoZones(
          sb,
          market_code ? { market_code } : undefined,
        );
        return mcpJsonResult(
          { geoZones },
          { tool: "list_geo_zones", rowCount: geoZones.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_geo_zones",
        );
      }
    },
  );

  server.registerTool(
    "get_geo_zone",
    {
      description:
        "Hämta en vinzon med leveranszon. Fält som eligibility_status/is_active påverkar kundcheckout om de ändras via skrivverktyg.",
      inputSchema: {
        id: z.string().uuid().describe("geo_zones.id"),
      },
    },
    async ({ id }) => {
      try {
        const zone = await getGeoZone(sb, id);
        if (!zone) return mcpErrorResult("Geo zone not found", "get_geo_zone");
        return mcpJsonResult(zone, { tool: "get_geo_zone" });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_geo_zone",
        );
      }
    },
  );

  server.registerTool(
    "list_shipping_regions",
    {
      description:
        "Lista fraktregioner (shipping_regions) med producer_count. Används för producenttilldelning, inte direkt kassapris.",
      inputSchema: {},
    },
    async () => {
      try {
        const regions = await listShippingRegions(sb);
        return mcpJsonResult(
          { regions },
          { tool: "list_shipping_regions", rowCount: regions.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_shipping_regions",
        );
      }
    },
  );

  server.registerTool(
    "get_shipping_region",
    {
      description: "Hämta en fraktregion inklusive producer_count.",
      inputSchema: {
        id: z.string().uuid().describe("shipping_regions.id"),
      },
    },
    async ({ id }) => {
      try {
        const region = await getShippingRegion(sb, id);
        if (!region) {
          return mcpErrorResult("Shipping region not found", "get_shipping_region");
        }
        return mcpJsonResult(region, { tool: "get_shipping_region" });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_shipping_region",
        );
      }
    },
  );

  server.registerTool(
    "list_customer_shipping_rates",
    {
      description:
        "Lista kundfraktpriser (customer_shipping_rates). Dessa är REVENUE-priser i kassan (inte bärarkostnad). Aktiva rader med flat_fee_cents / free_shipping påverkar checkout direkt.",
      inputSchema: {},
    },
    async () => {
      try {
        const entries = await listCustomerShippingRates(sb);
        return mcpJsonResult(
          { entries },
          { tool: "list_customer_shipping_rates", rowCount: entries.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_customer_shipping_rates",
        );
      }
    },
  );

  server.registerTool(
    "list_freight_catalogue",
    {
      description:
        "Lista intern fraktkatalog (providers, services, rates, components, packaging). Carrier-kostnad — påverkar inte kassans kundpris direkt. Historiska quotes fryses separat.",
      inputSchema: {},
    },
    async () => {
      try {
        const catalogue = await listFreightCatalogue(sb);
        return mcpJsonResult(catalogue, {
          tool: "list_freight_catalogue",
          rowCount:
            catalogue.providers.length +
            catalogue.services.length +
            catalogue.rates.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_freight_catalogue",
        );
      }
    },
  );

  server.registerTool(
    "preview_outbound_freight",
    {
      description:
        "Torrkalkyl av outbound Instabee/Budbee Light (samma som admin Diagnostik). Persisterar inget och ändrar inte kassan.",
      inputSchema: {
        destination_country: z.string().optional().describe("Default SE"),
        bottle_count: z.number().optional(),
        max_bottles: z.number().optional().describe("Per paket, default 6"),
        length_m: z.number().nullable().optional(),
        width_m: z.number().nullable().optional(),
        height_m: z.number().nullable().optional(),
        as_of_date: z.string().optional(),
        base_price_cents: z.number().optional(),
      },
    },
    async (params) => {
      try {
        const breakdown = previewOutboundFreight(params);
        return mcpJsonResult(
          { breakdown },
          { tool: "preview_outbound_freight" },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "preview_outbound_freight",
        );
      }
    },
  );

  server.registerTool(
    "list_pickup_zones",
    {
      description:
        "Lista upphämtningszoner (pallet_zones zone_type=pickup) med pallstatistik. Delivery-zoner hanteras under geo-zones.",
      inputSchema: {},
    },
    async () => {
      try {
        const zones = await listPickupZonesWithStats(sb);
        return mcpJsonResult(
          { zones },
          { tool: "list_pickup_zones", rowCount: zones.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_pickup_zones",
        );
      }
    },
  );

  server.registerTool(
    "get_pickup_zone",
    {
      description: "Hämta en upphämtningszon. Fel om zonen är delivery-typ.",
      inputSchema: {
        id: z.string().uuid().describe("pallet_zones.id"),
      },
    },
    async ({ id }) => {
      try {
        const zone = await getPickupZone(sb, id);
        if (!zone) {
          return mcpErrorResult("Pickup zone not found", "get_pickup_zone");
        }
        return mcpJsonResult(zone, { tool: "get_pickup_zone" });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_pickup_zone",
        );
      }
    },
  );

  server.registerTool(
    "list_pallet_freight_quotes",
    {
      description:
        "Lista inbound freight quotes för en PACT-pall (carrier-kostnad). selected quote används i admin-ops; påverkar inte kundkassan direkt.",
      inputSchema: {
        pallet_id: z.string().uuid().describe("pallets.id"),
      },
    },
    async ({ pallet_id }) => {
      try {
        const quotes = await listPalletFreightQuotes(sb, pallet_id);
        return mcpJsonResult(
          { quotes },
          { tool: "list_pallet_freight_quotes", rowCount: quotes.length },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_pallet_freight_quotes",
        );
      }
    },
  );

  server.registerTool(
    "list_b2b_producer_status",
    {
      description:
        "Lista B2B producentstatus/progress för en Dirty Wine-pall (samma översikt som admin status-sidan).",
      inputSchema: {
        shipment_id: z
          .string()
          .uuid()
          .describe("b2b_pallet_shipments.id"),
      },
    },
    async ({ shipment_id }) => {
      try {
        const overview = await loadB2bPalletStatusOverview(shipment_id);
        if (!overview) {
          return mcpErrorResult(
            "B2B pallet shipment not found",
            "list_b2b_producer_status",
          );
        }
        return mcpJsonResult(overview, {
          tool: "list_b2b_producer_status",
          rowCount: overview.producers?.length ?? 0,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_b2b_producer_status",
        );
      }
    },
  );
}
