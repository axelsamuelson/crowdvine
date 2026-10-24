import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createCustomerShippingRate,
  createFreightCatalogueEntry,
  createGeoZone,
  createPactPallet,
  createPickupZoneCore,
  createShippingRegion,
  deleteGeoZoneRow,
  deletePactPallet,
  deletePalletZoneCore,
  deleteShippingRegion,
  selectPactPalletFreightQuote,
  updateCustomerShippingRate,
  updateFreightCatalogueEntry,
  updateGeoZone,
  updatePactPalletFields,
  updatePickupZoneCore,
  updateShippingRegion,
} from "@/lib/admin/lager-frakt-writes";
import {
  getGeoZone,
  getPickupZone,
  getShippingRegion,
} from "@/lib/admin/lager-frakt-reads";
import { mcpWriteTool, requireConfirm } from "../utils/write-tool";

const freightKind = z.enum([
  "provider",
  "service",
  "rate",
  "component",
  "packaging",
]);

export function registerLagerFraktWriteTools(
  server: McpServer,
  sb: SupabaseClient,
) {
  server.registerTool(
    "create_geo_zone",
    {
      description:
        "Skapa vinzon. eligibility_status/is_active påverkar kundcheckout. Kräver confirm: true. Synkar leveranszon när aktiv.",
      inputSchema: {
        market_code: z.string(),
        country_code: z.string(),
        name: z.string(),
        display_name: z.string(),
        zone_type: z.string(),
        eligibility_status: z.string(),
        city: z.string(),
        region_code: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        is_active: z.boolean().optional(),
        sort_order: z.number().optional(),
        confirm: z.literal(true),
      },
    },
    async (params) => {
      const { confirm, ...input } = params;
      return mcpWriteTool(sb, "create_geo_zone", params as Record<string, unknown>, async () => {
        if (confirm !== true) {
          throw new Error("create_geo_zone requires confirm: true");
        }
        return createGeoZone(sb, input);
      });
    },
  );

  server.registerTool(
    "update_geo_zone",
    {
      description:
        "Uppdatera vinzon. eligibility_status/is_active kräver confirm: true. Returnerar before/after.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        display_name: z.string().optional(),
        zone_type: z.string().optional(),
        eligibility_status: z.string().optional(),
        country_code: z.string().optional(),
        region_code: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        currency_code: z.string().nullable().optional(),
        is_active: z.boolean().optional(),
        sort_order: z.number().optional(),
        confirm: z.boolean().optional(),
      },
    },
    async (params) => {
      const { id, confirm: _c, ...rest } = params;
      return mcpWriteTool(
        sb,
        "update_geo_zone",
        params as Record<string, unknown>,
        async () => {
          requireConfirm(params as Record<string, unknown>, {
            whenPresent: ["eligibility_status", "is_active"],
            label: "Updating geo zone checkout visibility",
          });
          return updateGeoZone(sb, id, rest);
        },
        { loadBefore: () => getGeoZone(sb, id) },
      );
    },
  );

  server.registerTool(
    "delete_geo_zone",
    {
      description:
        "Ta bort vinzon (+ försök ta bort kopplad leveranszon). Kräver confirm: true.",
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.literal(true),
      },
    },
    async ({ id, confirm }) =>
      mcpWriteTool(
        sb,
        "delete_geo_zone",
        { id, confirm },
        async () => {
          if (confirm !== true) throw new Error("delete_geo_zone requires confirm: true");
          const before = await deleteGeoZoneRow(sb, id);
          let deliveryDeleted = false;
          let deliveryWarning: string | undefined;
          if (before.default_delivery_zone_id) {
            try {
              await deletePalletZoneCore(sb, before.default_delivery_zone_id);
              deliveryDeleted = true;
            } catch (e) {
              deliveryWarning =
                e instanceof Error ? e.message : "Delivery zone not deleted";
            }
          }
          return { deleted: true, deliveryDeleted, deliveryWarning };
        },
        { loadBefore: () => getGeoZone(sb, id) },
      ),
  );

  server.registerTool(
    "create_shipping_region",
    {
      description: "Skapa fraktregion (producenttilldelning; inte kassapris).",
      inputSchema: {
        name: z.string(),
        country_code: z.string(),
        description: z.string().nullable().optional(),
      },
    },
    async (params) =>
      mcpWriteTool(sb, "create_shipping_region", params, async () =>
        createShippingRegion(sb, params),
      ),
  );

  server.registerTool(
    "update_shipping_region",
    {
      description: "Uppdatera fraktregion.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        country_code: z.string().optional(),
        description: z.string().nullable().optional(),
      },
    },
    async (params) => {
      const { id, ...rest } = params;
      return mcpWriteTool(
        sb,
        "update_shipping_region",
        params,
        async () => updateShippingRegion(sb, id, rest),
        { loadBefore: () => getShippingRegion(sb, id) },
      );
    },
  );

  server.registerTool(
    "delete_shipping_region",
    {
      description: "Ta bort fraktregion (FK SET NULL). Kräver confirm: true.",
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.literal(true),
      },
    },
    async ({ id, confirm }) =>
      mcpWriteTool(
        sb,
        "delete_shipping_region",
        { id, confirm },
        async () => {
          if (confirm !== true) {
            throw new Error("delete_shipping_region requires confirm: true");
          }
          return deleteShippingRegion(sb, id);
        },
        { loadBefore: () => getShippingRegion(sb, id) },
      ),
  );

  server.registerTool(
    "create_pickup_zone",
    {
      description: "Skapa upphämtningszon (pickup).",
      inputSchema: {
        name: z.string(),
        radius_km: z.number(),
        center_lat: z.number(),
        center_lon: z.number(),
      },
    },
    async (params) =>
      mcpWriteTool(sb, "create_pickup_zone", params, async () =>
        createPickupZoneCore(sb, params),
      ),
  );

  server.registerTool(
    "update_pickup_zone",
    {
      description: "Uppdatera upphämtningszon.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        radius_km: z.number().optional(),
        center_lat: z.number().optional(),
        center_lon: z.number().optional(),
      },
    },
    async (params) => {
      const { id, ...rest } = params;
      return mcpWriteTool(
        sb,
        "update_pickup_zone",
        params,
        async () => updatePickupZoneCore(sb, id, rest),
        { loadBefore: () => getPickupZone(sb, id) },
      );
    },
  );

  server.registerTool(
    "delete_pickup_zone",
    {
      description:
        "Ta bort upphämtningszon (blockeras om länkad). Kräver confirm: true.",
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.literal(true),
      },
    },
    async ({ id, confirm }) =>
      mcpWriteTool(
        sb,
        "delete_pickup_zone",
        { id, confirm },
        async () => {
          if (confirm !== true) {
            throw new Error("delete_pickup_zone requires confirm: true");
          }
          await deletePalletZoneCore(sb, id);
          return { deleted: true, id };
        },
        { loadBefore: () => getPickupZone(sb, id) },
      ),
  );

  server.registerTool(
    "create_customer_shipping_rate",
    {
      description:
        "Skapa kundfraktpris. PÅVERKAR KASSAN (revenue). Kräver confirm: true. Returnerar before/after.",
      inputSchema: {
        flat_fee_cents: z.number().optional(),
        free_shipping: z.boolean().optional(),
        country_code: z.string().optional(),
        free_shipping_threshold_cents: z.number().nullable().optional(),
        active: z.boolean().optional(),
        notes: z.string().nullable().optional(),
        confirm: z.literal(true),
      },
    },
    async (params) => {
      const { confirm, ...rest } = params;
      return mcpWriteTool(
        sb,
        "create_customer_shipping_rate",
        params as Record<string, unknown>,
        async () => {
          if (confirm !== true) {
            throw new Error(
              "create_customer_shipping_rate requires confirm: true (checkout)",
            );
          }
          return createCustomerShippingRate(sb, rest);
        },
        { loadBefore: async () => null },
      );
    },
  );

  server.registerTool(
    "update_customer_shipping_rate",
    {
      description:
        "Uppdatera/inaktivera kundfraktpris. PÅVERKAR KASSAN. Kräver confirm: true. Returnerar before/after.",
      inputSchema: {
        id: z.string().uuid(),
        flat_fee_cents: z.number().optional(),
        free_shipping: z.boolean().optional(),
        free_shipping_threshold_cents: z.number().nullable().optional(),
        country_code: z.string().optional(),
        active: z.boolean().optional(),
        notes: z.string().nullable().optional(),
        confirm: z.literal(true),
      },
    },
    async (params) => {
      const { id, confirm, ...rest } = params;
      return mcpWriteTool(
        sb,
        "update_customer_shipping_rate",
        params as Record<string, unknown>,
        async () => {
          if (confirm !== true) {
            throw new Error(
              "update_customer_shipping_rate requires confirm: true (checkout)",
            );
          }
          return updateCustomerShippingRate(sb, id, rest);
        },
        {
          loadBefore: async () => {
            const { data } = await sb
              .from("customer_shipping_rates")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            return data;
          },
        },
      );
    },
  );

  server.registerTool(
    "create_freight_catalogue_entry",
    {
      description:
        "Skapa fraktkatalograd (carrier-kostnad, inte kassa). confirm:true om fields.active sätts.",
      inputSchema: {
        kind: freightKind,
        fields: z.record(z.unknown()),
        confirm: z.boolean().optional(),
      },
    },
    async ({ kind, fields, confirm }) => {
      const merged = { kind, ...fields, confirm };
      return mcpWriteTool(sb, "create_freight_catalogue_entry", merged, async () => {
        requireConfirm(merged, {
          whenPresent: ["active"],
          label: "Creating catalogue entry with active flag",
        });
        return createFreightCatalogueEntry(sb, {
          kind,
          ...fields,
        } as { kind: "provider" } & Record<string, unknown>);
      });
    },
  );

  server.registerTool(
    "update_freight_catalogue_entry",
    {
      description:
        "Uppdatera fraktkatalograd. confirm:true om active eller pris-fält ändras.",
      inputSchema: {
        kind: freightKind,
        id: z.string().uuid(),
        fields: z.record(z.unknown()),
        confirm: z.boolean().optional(),
      },
    },
    async ({ kind, id, fields, confirm }) => {
      const merged = { kind, id, ...fields, confirm };
      return mcpWriteTool(sb, "update_freight_catalogue_entry", merged, async () => {
        requireConfirm(merged, {
          whenPresent: [
            "active",
            "base_price_amount",
            "value",
            "price_per_increment",
          ],
          label: "Updating freight catalogue price/active",
        });
        return updateFreightCatalogueEntry(sb, {
          kind,
          id,
          ...fields,
        } as { kind: "provider"; id: string } & Record<string, unknown>);
      });
    },
  );

  server.registerTool(
    "create_pallet",
    {
      description:
        "Skapa PACT-pall. Ändrar inte status/shipping. Kapacitet påverkar fyllnadsregler.",
      inputSchema: {
        name: z.string(),
        delivery_zone_id: z.string().uuid(),
        pickup_zone_id: z.string().uuid(),
        cost_cents: z.number(),
        bottle_capacity: z.number(),
        min_bottles_to_complete: z.number().optional(),
        description: z.string().optional(),
        last_mile_cost_cents_per_bottle: z.number().nullable().optional(),
      },
    },
    async (params) =>
      mcpWriteTool(sb, "create_pallet", params as Record<string, unknown>, async () =>
        createPactPallet(sb, params),
      ),
  );

  server.registerTool(
    "update_pallet",
    {
      description:
        "Uppdatera PACT-pall (zoner/kostnad/kapacitet). Ändrar ALDRIG status. Kapacitetsändring kräver confirm: true.",
      inputSchema: {
        id: z.string().uuid(),
        name: z.string().optional(),
        description: z.string().optional(),
        delivery_zone_id: z.string().uuid().optional(),
        pickup_zone_id: z.string().uuid().optional(),
        cost_cents: z.number().optional(),
        bottle_capacity: z.number().optional(),
        min_bottles_to_complete: z.number().optional(),
        last_mile_cost_cents_per_bottle: z.number().nullable().optional(),
        confirm: z.boolean().optional(),
      },
    },
    async (params) => {
      const { id, confirm: _c, ...rest } = params;
      return mcpWriteTool(
        sb,
        "update_pallet",
        params as Record<string, unknown>,
        async () => {
          requireConfirm(params as Record<string, unknown>, {
            whenPresent: ["bottle_capacity", "min_bottles_to_complete"],
            label: "Changing pallet capacity/MOQ",
          });
          return updatePactPalletFields(sb, id, rest);
        },
        {
          loadBefore: async () => {
            const { data } = await sb
              .from("pallets")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            return data;
          },
        },
      );
    },
  );

  server.registerTool(
    "delete_pallet",
    {
      description:
        "Ta bort PACT-pall utan aktiva reservationer. Kräver confirm: true. Debitering/shipping finns inte i MCP.",
      inputSchema: {
        id: z.string().uuid(),
        confirm: z.literal(true),
      },
    },
    async ({ id, confirm }) =>
      mcpWriteTool(
        sb,
        "delete_pallet",
        { id, confirm },
        async () => {
          if (confirm !== true) throw new Error("delete_pallet requires confirm: true");
          await deletePactPallet(sb, id);
          return { deleted: true, id };
        },
        {
          loadBefore: async () => {
            const { data } = await sb
              .from("pallets")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            return data;
          },
        },
      ),
  );

  server.registerTool(
    "select_pallet_freight_quote",
    {
      description:
        "Välj inbound freight quote för PACT-pall (carrier-kostnad). Påverkar inte kassan.",
      inputSchema: {
        pallet_id: z.string().uuid(),
        quote_id: z.string().uuid(),
      },
    },
    async ({ pallet_id, quote_id }) =>
      mcpWriteTool(
        sb,
        "select_pallet_freight_quote",
        { pallet_id, quote_id },
        async () => selectPactPalletFreightQuote(pallet_id, quote_id),
      ),
  );
}
