import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createB2bOrderFromInvoice, listB2bOrders } from "@/lib/delivery-notes/b2b-orders";
import {
  createDeliveryNote,
  getDeliveryNote,
  listDeliveryNotes,
} from "@/lib/delivery-notes/notes";
import {
  deliveryNoteEmailAttachment,
  renderDeliveryNotePdf,
} from "@/lib/delivery-notes/pdf";
import {
  createDeliveryNoteObject,
  createDeliveryNoteSchema,
  listDeliveryNotesSchema,
  zodMessage,
} from "@/lib/delivery-notes/schemas";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpDocumentResult, mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

const noteIdSchema = z.object({
  id: z.string().uuid("Ogiltigt leveranssedel-id"),
});

const invoiceIdSchema = z.object({
  invoice_id: z.string().uuid("Ogiltigt faktura-id"),
});

function fail(tool: string, error: unknown) {
  return mcpErrorResult(error instanceof Error ? error.message : "Okänt fel", tool);
}

function paramsOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

export function registerDeliveryNoteTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_delivery_notes",
    {
      description:
        "Lista leveranssedlar. Filter: recipient_id och invoice_id. Sedeln visar antal till restaurang eller bar, inte priser.",
      inputSchema: listDeliveryNotesSchema.shape,
    },
    async (args) => {
      const parsed = listDeliveryNotesSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "list_delivery_notes");
      try {
        const rows = await listDeliveryNotes(sb, parsed.data);
        const data = rows.map((row) => ({
          id: row.id,
          note_number: row.note_number,
          invoice_id: row.invoice_id,
          invoice_number: row.invoice_number,
          recipient_id: row.recipient_id,
          delivery_date: row.delivery_date,
          company_name:
            typeof row.recipient_snapshot.company_name === "string"
              ? row.recipient_snapshot.company_name
              : "",
          created_at: row.created_at,
        }));
        return mcpJsonResult(data, { tool: "list_delivery_notes", rowCount: data.length });
      } catch (error) {
        return fail("list_delivery_notes", error);
      }
    },
  );

  server.registerTool(
    "get_delivery_note",
    {
      description: "Hämta en leveranssedel som JSON med rader. För PDF till ett mejlutkast, använd get_delivery_note_pdf.",
      inputSchema: noteIdSchema.shape,
    },
    async (args) => {
      const parsed = noteIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "get_delivery_note");
      try {
        const row = await getDeliveryNote(sb, parsed.data.id);
        if (!row) return mcpErrorResult("Leveranssedeln hittades inte", "get_delivery_note");
        return mcpJsonResult(row, { tool: "get_delivery_note", rowCount: 1 });
      } catch (error) {
        return fail("get_delivery_note", error);
      }
    },
  );

  server.registerTool(
    "get_delivery_note_pdf",
    {
      description:
        "Hämta leveranssedeln som PDF att bifoga i ett mejlutkast. Textsvaret innehåller to_email, filnamn och pdf_base64. PDF:en följer också som fil. Skickar inget mejl.",
      inputSchema: noteIdSchema.shape,
    },
    async (args) => {
      const parsed = noteIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "get_delivery_note_pdf");
      try {
        const row = await getDeliveryNote(sb, parsed.data.id);
        if (!row) return mcpErrorResult("Leveranssedeln hittades inte", "get_delivery_note_pdf");
        const pdf = renderDeliveryNotePdf(row);
        const attachment = deliveryNoteEmailAttachment(row, pdf);
        return mcpDocumentResult(
          attachment,
          {
            uri: `crowdvine://delivery-notes/${row.id}/${attachment.filename}`,
            mimeType: "application/pdf",
            bytes: pdf,
          },
          { tool: "get_delivery_note_pdf", rowCount: 1 },
        );
      } catch (error) {
        return fail("get_delivery_note_pdf", error);
      }
    },
  );

  server.registerTool(
    "create_delivery_note",
    {
      description:
        "Skapa en leveranssedel till en restaurang eller bar. Skicka invoice_id för att kopiera fakturans rader, eller recipient_id plus lines (wine_id eller description, och quantity). Priser tas inte med. Hämta PDF:en med get_delivery_note_pdf. Skickar inget mejl.",
      inputSchema: createDeliveryNoteObject.shape,
    },
    async (args) => {
      const parsed = createDeliveryNoteSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "create_delivery_note");
      return mcpWriteTool(sb, "create_delivery_note", paramsOf(parsed.data), async () => {
        const actor = await getMcpActorProfileId(sb);
        return createDeliveryNote(sb, parsed.data, { createdVia: "mcp", createdBy: actor });
      });
    },
  );

  server.registerTool(
    "list_b2b_orders",
    {
      description:
        "Lista Dirty Wine B2B-ordrar (samma lista som Admin → Bookings → Dirty Wine → Ordrar). Senaste 100.",
      inputSchema: z.object({}).shape,
    },
    async () => {
      try {
        const rows = await listB2bOrders(sb);
        return mcpJsonResult(rows, { tool: "list_b2b_orders", rowCount: rows.length });
      } catch (error) {
        return fail("list_b2b_orders", error);
      }
    },
  );

  server.registerTool(
    "create_b2b_order",
    {
      description:
        "Lägg in en B2B-order från en sparad faktura. Ordern syns under Admin → Bookings → Dirty Wine → Ordrar. Om ordernumret redan finns returneras den befintliga ordern. Skapar ingen leveranssedel.",
      inputSchema: invoiceIdSchema.shape,
    },
    async (args) => {
      const parsed = invoiceIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "create_b2b_order");
      return mcpWriteTool(sb, "create_b2b_order", paramsOf(parsed.data), async () => {
        const actor = await getMcpActorProfileId(sb);
        return createB2bOrderFromInvoice(sb, parsed.data, actor);
      });
    },
  );
}
