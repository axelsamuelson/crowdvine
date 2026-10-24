import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  getEnrichedPactPallet,
  listEnrichedPactPallets,
} from "@/lib/admin/pact-pallet-list";
import { listPalletReservationsMcpSafe } from "@/lib/admin/lager-frakt-reads";
import { buildAdminPalletOperatingSummaryForId } from "@/lib/admin-pallet-operating-summary";
import { mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

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
        pickup_producer_id: z
          .string()
          .uuid()
          .optional()
          .describe("Manuell upphämtningsproducent"),
      },
    },
    async (args) => {
      return mcpWriteTool(
        sb,
        "create_b2b_pallet",
        args as Record<string, unknown>,
        async () => {
          const name = args.name.trim();
          if (!name) throw new Error("name is required");

          const { data, error } = await sb
            .from("b2b_pallet_shipments")
            .insert({
              name,
              cost_cents: args.cost_cents ?? null,
              shipped_at: args.shipped_at ?? null,
              pickup_producer_id: args.pickup_producer_id ?? null,
            })
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
        },
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
        async () => {
          const quantity = Math.max(1, Math.floor(args.quantity));
          const { data, error } = await sb
            .from("b2b_pallet_shipment_items")
            .insert({
              shipment_id: args.pallet_id,
              wine_id: args.wine_id,
              quantity,
              cost_cents_override: args.cost_cents_override ?? null,
            })
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
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
      return mcpWriteTool(
        sb,
        "update_b2b_pallet_item",
        args as Record<string, unknown>,
        async () => {
          const { id, quantity, quantity_sold, cost_cents_override } = args;
          const patch: Record<string, unknown> = {};
          if (quantity !== undefined) {
            patch.quantity = Math.max(0, Math.floor(quantity));
          }
          if (quantity_sold !== undefined) {
            patch.quantity_sold = Math.max(0, Math.floor(quantity_sold));
          }
          if (cost_cents_override !== undefined) {
            patch.cost_cents_override = cost_cents_override;
          }
          if (Object.keys(patch).length === 0) {
            throw new Error("No fields to update");
          }

          const { data, error } = await sb
            .from("b2b_pallet_shipment_items")
            .update(patch)
            .eq("id", id)
            .select()
            .single();

          if (error) throw new Error(error.message);
          return data;
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
