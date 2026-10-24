import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  addWineToB2bPalletShipment,
  createB2bPalletShipment,
  createB2bProducerShareLink,
  createB2bShareLink,
  deleteB2bPalletShipment,
  replaceB2bProducerWines,
  updateB2bPalletShipment,
  updateB2bPalletShipmentItem,
  upsertB2bProducerStatus,
  upsertB2bProducerStatusSchema,
} from "@/lib/admin/b2b-pallet-writes";
import {
  getEnrichedPactPallet,
  listEnrichedPactPallets,
} from "@/lib/admin/pact-pallet-list";
import { listPalletReservationsMcpSafe } from "@/lib/admin/lager-frakt-reads";
import { buildAdminPalletOperatingSummaryForId } from "@/lib/admin-pallet-operating-summary";
import { B2B_PALLET_STATUSES } from "@/lib/b2b/pallet-status";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool, requireConfirm } from "../utils/write-tool";

const B2B_PALLET_MCP_SELECT = `
  *,
  b2b_pallet_shipment_items(
    *,
    wines(
      wine_name,
      color,
      cost_amount,
      cost_currency,
      producers(name)
    )
  )
`;

type WineEmbedRow = {
  wine_name?: string | null;
  color?: string | null;
  cost_amount?: number | null;
  cost_currency?: string | null;
  producers?: { name?: string | null } | null;
};

type B2bItemRow = Record<string, unknown> & {
  wines?: WineEmbedRow | null;
};

function mapWineEmbed(wine: WineEmbedRow | null | undefined) {
  if (!wine) return null;
  const import_price_eur =
    wine.cost_currency === "EUR" && wine.cost_amount != null
      ? Number(wine.cost_amount)
      : null;
  return {
    name: wine.wine_name ?? null,
    type: wine.color ?? null,
    import_price_eur,
    producer_name: wine.producers?.name ?? null,
  };
}

function enrichB2bShipment(row: Record<string, unknown>) {
  const rawItems = (row.b2b_pallet_shipment_items as B2bItemRow[] | null) ?? [];
  const items = rawItems.map((item) => {
    const { wines, ...rest } = item;
    return {
      ...rest,
      wine: mapWineEmbed(wines),
    };
  });
  const { b2b_pallet_shipment_items: _omit, ...header } = row;
  return { ...header, items };
}

function mcpSiteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

async function loadB2bPalletBefore(sb: SupabaseClient, id: string) {
  const { data } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_MCP_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data
    ? enrichB2bShipment(data as Record<string, unknown>)
    : null;
}

export function registerPalletTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_b2b_pallets",
    {
      description:
        "Lista B2B-pallar (b2b_pallet_shipments) med radartiklar och vin/producent-detaljer.",
      inputSchema: {
        is_active: z
          .boolean()
          .optional()
          .describe("Filtrera på is_active. Utelämna för alla."),
      },
    },
    async ({ is_active }) => {
      try {
        let q = sb
          .from("b2b_pallet_shipments")
          .select(B2B_PALLET_MCP_SELECT)
          .order("created_at", { ascending: false });
        if (is_active !== undefined) q = q.eq("is_active", is_active);
        const { data, error } = await q;
        if (error) return mcpErrorResult(error.message, "list_b2b_pallets");
        const rows = (data ?? []).map((row) =>
          enrichB2bShipment(row as Record<string, unknown>),
        );
        return mcpJsonResult(rows, {
          tool: "list_b2b_pallets",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_b2b_pallets",
        );
      }
    },
  );

  server.registerTool(
    "get_b2b_pallet",
    {
      description: "Hämta en B2B-pall via id med alla radartiklar.",
      inputSchema: {
        id: z.string().uuid().describe("B2B pallet shipment UUID"),
      },
    },
    async ({ id }) => {
      try {
        const { data, error } = await sb
          .from("b2b_pallet_shipments")
          .select(B2B_PALLET_MCP_SELECT)
          .eq("id", id)
          .maybeSingle();
        if (error) return mcpErrorResult(error.message, "get_b2b_pallet");
        if (!data) return mcpErrorResult("B2B pallet not found", "get_b2b_pallet");
        return mcpJsonResult(enrichB2bShipment(data as Record<string, unknown>), {
          tool: "get_b2b_pallet",
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_b2b_pallet",
        );
      }
    },
  );

  server.registerTool(
    "create_b2b_pallet",
    {
      description: "Skapa en ny B2B-pall (b2b_pallet_shipments).",
      inputSchema: {
        name: z.string().describe("Pallens namn"),
        status: z
          .enum(B2B_PALLET_STATUSES)
          .default("inactive")
          .describe("inactive (default), in_transit, eller active"),
        cost_cents: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Transportkostnad ex moms i öre"),
        shipped_at: z
          .string()
          .optional()
          .describe("ISO 8601-tidsstämpel när pallen skickades"),
        delivered_at: z.string().optional(),
        pickup_producer_id: z
          .string()
          .uuid()
          .optional()
          .describe("Manuell upphämtningsproducent"),
        is_new: z.boolean().optional(),
        items: z
          .array(
            z.object({
              wine_id: z.string().uuid(),
              quantity: z.number().int().positive(),
              quantity_sold: z.number().int().nonnegative().optional(),
              cost_cents_override: z
                .number()
                .int()
                .nonnegative()
                .nullable()
                .optional(),
            }),
          )
          .optional(),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "create_b2b_pallet",
        args as Record<string, unknown>,
        async () => createB2bPalletShipment(sb, args),
      );
    },
  );

  server.registerTool(
    "add_wine_to_b2b_pallet",
    {
      description: "Lägg till ett vin på en B2B-pall.",
      inputSchema: {
        pallet_id: z.string().uuid().describe("B2B pallet shipment UUID"),
        wine_id: z.string().uuid().describe("Wine UUID"),
        quantity: z.number().int().positive().describe("Antal flaskor"),
        cost_cents_override: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Total kostnad per flaska i öre, inklusive alkoholskatt"),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "add_wine_to_b2b_pallet",
        args as Record<string, unknown>,
        async () => addWineToB2bPalletShipment(sb, args),
        {
          loadBefore: () => loadB2bPalletBefore(sb, args.pallet_id),
        },
      );
    },
  );

  server.registerTool(
    "update_b2b_pallet_item",
    {
      description: "Uppdatera en rad på en B2B-pall (partial).",
      inputSchema: {
        id: z.string().uuid().describe("b2b_pallet_shipment_items UUID"),
        quantity: z.number().int().nonnegative().optional(),
        quantity_sold: z.number().int().nonnegative().optional(),
        cost_cents_override: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional()
          .describe("Total kostnad per flaska i öre, inklusive alkoholskatt"),
      },
    },
    async (args) => {
      const { id, ...patch } = args;
      return mcpWriteTool(
        sb,
        "update_b2b_pallet_item",
        args as Record<string, unknown>,
        async () => updateB2bPalletShipmentItem(sb, id, patch),
        {
          loadBefore: async () => {
            const { data } = await sb
              .from("b2b_pallet_shipment_items")
              .select("*")
              .eq("id", id)
              .maybeSingle();
            return data ?? null;
          },
        },
      );
    },
  );

  server.registerTool(
    "update_b2b_pallet",
    {
      description:
        "Uppdatera en B2B-pall (namn, status, is_new, items, m.m.). Kräver confirm:true när status, is_new eller items ändras (påverkar storefront).",
      inputSchema: {
        id: z.string().uuid().describe("B2B pallet shipment UUID"),
        name: z.string().optional(),
        status: z.enum(B2B_PALLET_STATUSES).optional(),
        shipped_at: z.string().nullable().optional(),
        delivered_at: z.string().nullable().optional(),
        cost_cents: z.number().int().nonnegative().nullable().optional(),
        pickup_producer_id: z.string().uuid().nullable().optional(),
        is_new: z.boolean().optional(),
        items: z
          .array(
            z.object({
              wine_id: z.string().uuid(),
              quantity: z.number().int().positive(),
              quantity_sold: z.number().int().nonnegative().optional(),
              cost_cents_override: z
                .number()
                .int()
                .nonnegative()
                .nullable()
                .optional(),
            }),
          )
          .optional()
          .describe("Ersätter hela pallens rader om angivet"),
        confirm: z
          .boolean()
          .optional()
          .describe("Krävs true när status, is_new eller items skickas"),
      },
    },
    async (args) => {
      const params = args as Record<string, unknown>;
      return mcpWriteTool(
        sb,
        "update_b2b_pallet",
        params,
        async () => {
          requireConfirm(params, {
            whenPresent: ["status", "is_new", "items"],
            label: "Changing status, is_new, or items",
          });
          const { id, confirm: _confirm, ...input } = args;
          return updateB2bPalletShipment(sb, id, input);
        },
        { loadBefore: () => loadB2bPalletBefore(sb, args.id) },
      );
    },
  );

  server.registerTool(
    "delete_b2b_pallet",
    {
      description:
        "Radera en B2B-pall och dess rader. Kräver alltid confirm:true.",
      inputSchema: {
        id: z.string().uuid().describe("B2B pallet shipment UUID"),
        confirm: z
          .literal(true)
          .describe("Måste vara true för att bekräfta radering"),
      },
    },
    async (args) => {
      const params = args as Record<string, unknown>;
      return mcpWriteTool(
        sb,
        "delete_b2b_pallet",
        params,
        async () => {
          requireConfirm(params, {
            always: true,
            label: "Deleting a B2B pallet",
          });
          return deleteB2bPalletShipment(sb, args.id);
        },
        { loadBefore: () => loadB2bPalletBefore(sb, args.id) },
      );
    },
  );

  server.registerTool(
    "update_b2b_producer_status",
    {
      description:
        "Upsert producentstatus på en B2B-pall (beslut, pickup, faktura, wine_decisions).",
      inputSchema: {
        shipment_id: z.string().uuid(),
        producer_id: z.string().uuid(),
        order_sent_at: z.string().nullable().optional(),
        producer_decision_status: z
          .enum(["pending", "confirmed", "partial", "declined"])
          .optional(),
        producer_decided_at: z.string().nullable().optional(),
        confirmed_quantity: z.number().int().nullable().optional(),
        pickup_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable()
          .optional(),
        pickup_date_confirmed_at: z.string().nullable().optional(),
        goods_ready_at: z.string().nullable().optional(),
        delivered_to_hub_at: z.string().nullable().optional(),
        invoice_received_at: z.string().nullable().optional(),
        invoice_paid_at: z.string().nullable().optional(),
        invoice_amount_cents: z.number().int().nullable().optional(),
        blocked_reason: z.string().max(2000).nullable().optional(),
        producer_note: z.string().max(4000).nullable().optional(),
        admin_note: z.string().max(4000).nullable().optional(),
        wine_decisions: z
          .array(
            z.object({
              wine_id: z.string().uuid(),
              decision_status: z.enum(["confirmed", "declined"]),
              confirmed_quantity: z.number().int().nullable().optional(),
              reject_reason: z.string().max(2000).nullable().optional(),
            }),
          )
          .min(1)
          .optional(),
        confirm: z
          .boolean()
          .optional()
          .describe(
            "Krävs true när producer_decision_status eller wine_decisions skickas",
          ),
      },
    },
    async (args) => {
      const params = args as Record<string, unknown>;
      return mcpWriteTool(
        sb,
        "update_b2b_producer_status",
        params,
        async () => {
          requireConfirm(params, {
            whenPresent: ["producer_decision_status", "wine_decisions"],
            label: "Changing producer decision status",
          });
          const { confirm: _confirm, ...rest } = args;
          const parsed = upsertB2bProducerStatusSchema.parse(rest);
          const actor = await getMcpActorProfileId(sb);
          return upsertB2bProducerStatus(sb, parsed, actor);
        },
        {
          loadBefore: async () => {
            const { data } = await sb
              .from("b2b_pallet_producer_status")
              .select("*")
              .eq("shipment_id", args.shipment_id)
              .eq("producer_id", args.producer_id)
              .maybeSingle();
            return data ?? null;
          },
        },
      );
    },
  );

  server.registerTool(
    "replace_b2b_producer_wines",
    {
      description:
        "Ersätt en producents viner på en B2B-pall (lägg till / ta bort / ändra antal). Övriga producenter lämnas orörda. Kräver confirm:true.",
      inputSchema: {
        shipment_id: z.string().uuid().describe("B2B pallet shipment UUID"),
        producer_id: z.string().uuid(),
        items: z.array(
          z.object({
            wine_id: z.string().uuid(),
            quantity: z.number().int().positive(),
          }),
        ),
        confirm: z
          .literal(true)
          .describe("Måste vara true för att bekräfta ersättning av viner"),
      },
    },
    async (args) => {
      const params = args as Record<string, unknown>;
      return mcpWriteTool(
        sb,
        "replace_b2b_producer_wines",
        params,
        async () => {
          requireConfirm(params, {
            always: true,
            label: "Replacing producer wines on a pallet",
          });
          return replaceB2bProducerWines(sb, args.shipment_id, {
            producer_id: args.producer_id,
            items: args.items,
          });
        },
        {
          loadBefore: () => loadB2bPalletBefore(sb, args.shipment_id),
        },
      );
    },
  );

  server.registerTool(
    "create_b2b_share_link",
    {
      description:
        "Skapa en delningslänk för hela B2B-pallens statusöversikt (alla producenter).",
      inputSchema: {
        shipment_id: z.string().uuid().describe("B2B pallet shipment UUID"),
        origin: z
          .string()
          .url()
          .optional()
          .describe(
            "Site origin for absolute URL; defaults to NEXT_PUBLIC_SITE_URL",
          ),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "create_b2b_share_link",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          return createB2bShareLink({
            shipmentId: args.shipment_id,
            createdBy: actor,
            origin: args.origin ?? mcpSiteOrigin(),
          });
        },
      );
    },
  );

  server.registerTool(
    "create_b2b_producer_share_link",
    {
      description:
        "Skapa en producent-scoped delningslänk för en B2B-pall (kräver att producenten har viner på pallen).",
      inputSchema: {
        shipment_id: z.string().uuid().describe("B2B pallet shipment UUID"),
        producer_id: z.string().uuid(),
        origin: z
          .string()
          .url()
          .optional()
          .describe(
            "Site origin for absolute URL; defaults to NEXT_PUBLIC_SITE_URL",
          ),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "create_b2b_producer_share_link",
        args as Record<string, unknown>,
        async () => {
          const actor = await getMcpActorProfileId(sb);
          return createB2bProducerShareLink({
            shipmentId: args.shipment_id,
            producerId: args.producer_id,
            createdBy: actor,
            origin: args.origin ?? mcpSiteOrigin(),
          });
        },
      );
    },
  );

  server.registerTool(
    "list_pallets",
    {
      description:
        "Lista PACT-pallar med samma berikning som admin: fill % (completion_percentage), wine_summary inkl. MOQ, min_bottles_to_complete, operating_summary och shadow_contribution. status/shipping_ordered påverkar kunder om de ändras via admin (skrivverktyg för shipping finns inte i MCP).",
      inputSchema: {
        status: z
          .string()
          .optional()
          .describe(
            "Filtrera på pallets.status (t.ex. open, complete, shipping_ordered).",
          ),
      },
    },
    async ({ status }) => {
      try {
        const rows = await listEnrichedPactPallets(
          sb,
          status ? { status } : undefined,
        );
        return mcpJsonResult(rows, {
          tool: "list_pallets",
          rowCount: rows.length,
        });
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "list_pallets",
        );
      }
    },
  );

  server.registerTool(
    "get_pallet",
    {
      description:
        "Hämta en PACT-pall med admin-paritet: wine_summary (MOQ), fill %, operating_summary (detalj), och reservationslista utan personuppgifter (id, status, total_bottles, vinrader).",
      inputSchema: {
        id: z.string().uuid().describe("PACT pallet UUID"),
      },
    },
    async ({ id }) => {
      try {
        const pallet = await getEnrichedPactPallet(sb, id);
        if (!pallet) return mcpErrorResult("Pallet not found", "get_pallet");

        const [operating_summary, reservations] = await Promise.all([
          buildAdminPalletOperatingSummaryForId(id),
          listPalletReservationsMcpSafe(sb, id),
        ]);

        return mcpJsonResult(
          {
            ...pallet,
            operating_summary:
              operating_summary ?? pallet.operating_summary ?? null,
            reservations: reservations ?? [],
          },
          { tool: "get_pallet" },
        );
      } catch (e) {
        return mcpErrorResult(
          e instanceof Error ? e.message : String(e),
          "get_pallet",
        );
      }
    },
  );
}
