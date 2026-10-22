import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  createInvoiceDraft,
  getInvoice,
  issueInvoice,
  listInvoices,
  updateInvoiceDraft,
} from "@/lib/invoices/drafts";
import { invoiceEmailAttachment, renderInvoicePdf } from "@/lib/invoices/pdf";
import { loadInvoiceSenderDefaults } from "@/lib/invoices/sender";
import {
  addInvoiceRecipientContact,
  findRecipientByOrgNumber,
  getInvoiceRecipient,
  listInvoiceRecipients,
  saveInvoiceRecipient,
  updateInvoiceRecipientContact,
} from "@/lib/invoices/recipients";
import {
  addContactToolSchema,
  createInvoiceDraftSchema,
  createRecipientToolSchema,
  listInvoicesSchema,
  updateContactToolSchema,
  updateInvoiceDraftSchema,
  zodMessage,
} from "@/lib/invoices/schemas";
import { getMcpActorProfileId } from "../utils/actor";
import { mcpDocumentResult, mcpErrorResult, mcpJsonResult } from "../utils/tool-result";
import { mcpWriteTool } from "../utils/write-tool";

/**
 * issue_invoice tilldelar löpnumret. get_invoice_pdf lämnar filen till mejlutkastet.
 * Inget verktyg makulerar, markerar betald eller skickar mejl.
 */

const recipientIdSchema = z.object({
  id: z.string().uuid("Ogiltigt mottagar-id"),
});

const invoiceIdSchema = z.object({
  id: z.string().uuid("Ogiltigt faktura-id"),
});

const listRecipientsSchema = z.object({
  query: z.string().optional().describe("Sök på företagsnamn eller organisationsnummer"),
});

function fail(tool: string, error: unknown) {
  return mcpErrorResult(error instanceof Error ? error.message : "Okänt fel", tool);
}

function paramsOf(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

export function registerInvoiceTools(server: McpServer, sb: SupabaseClient) {
  server.registerTool(
    "list_invoice_recipients",
    {
      description:
        "Sök fakturamottagare på företagsnamn eller organisationsnummer. Returnerar id, företagsnamn, org.nr, fakturamejl och primär kontakt.",
      inputSchema: listRecipientsSchema.shape,
    },
    async (args) => {
      const parsed = listRecipientsSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "list_invoice_recipients");
      try {
        const rows = await listInvoiceRecipients(sb, parsed.data.query);
        const data = rows.map((row) => ({
          id: row.id,
          company_name: row.company_name,
          org_number: row.org_number,
          email: row.email,
          primary_contact: row.primary_contact,
        }));
        return mcpJsonResult(data, { tool: "list_invoice_recipients", rowCount: data.length });
      } catch (error) {
        return fail("list_invoice_recipients", error);
      }
    },
  );

  server.registerTool(
    "get_invoice_recipient",
    {
      description: "Hämta en fakturamottagare med alla kontaktpersoner.",
      inputSchema: recipientIdSchema.shape,
    },
    async (args) => {
      const parsed = recipientIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "get_invoice_recipient");
      try {
        const row = await getInvoiceRecipient(sb, parsed.data.id);
        if (!row) return mcpErrorResult("Fakturamottagaren hittades inte", "get_invoice_recipient");
        return mcpJsonResult(
          {
            id: row.id,
            company_name: row.company_name,
            org_number: row.org_number,
            email: row.email,
            address: row.address,
            postal_code: row.postal_code,
            city: row.city,
            profile_id: row.profile_id,
            contacts: row.contacts,
            primary_contact: row.primary_contact,
          },
          { tool: "get_invoice_recipient", rowCount: 1 },
        );
      } catch (error) {
        return fail("get_invoice_recipient", error);
      }
    },
  );

  server.registerTool(
    "list_invoices",
    {
      description: "Lista fakturor. Filter: status, recipient_id och datumintervall (created_at, inklusive).",
      inputSchema: listInvoicesSchema.shape,
    },
    async (args) => {
      const parsed = listInvoicesSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "list_invoices");
      try {
        const rows = await listInvoices(sb, parsed.data);
        const data = rows.map((row) => ({
          id: row.id,
          invoice_number: row.invoice_number,
          status: row.status,
          recipient_id: row.recipient_id,
          invoice_date: row.invoice_date,
          delivery_date: row.delivery_date,
          due_date: row.due_date,
          currency: row.currency,
          subtotal_ore: row.subtotal_ore,
          vat_ore: row.vat_ore,
          total_ore: row.total_ore,
          created_via: row.created_via,
          created_at: row.created_at,
          company_name: row.recipient?.company_name ?? null,
        }));
        return mcpJsonResult(data, { tool: "list_invoices", rowCount: data.length });
      } catch (error) {
        return fail("list_invoices", error);
      }
    },
  );

  server.registerTool(
    "get_invoice",
    {
      description:
        "Hämta en faktura som JSON med rader och totalsummor i öre. För PDF till ett mejlutkast, använd get_invoice_pdf.",
      inputSchema: invoiceIdSchema.shape,
    },
    async (args) => {
      const parsed = invoiceIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "get_invoice");
      try {
        const row = await getInvoice(sb, parsed.data.id);
        if (!row) return mcpErrorResult("Fakturan hittades inte", "get_invoice");
        return mcpJsonResult(row, { tool: "get_invoice", rowCount: 1 });
      } catch (error) {
        return fail("get_invoice", error);
      }
    },
  );

  server.registerTool(
    "create_invoice_recipient",
    {
      description:
        "Skapa fakturamottagare med fakturamejl och kontakter. Om organisationsnumret redan finns skapas ingen ny rad; befintligt id returneras.",
      inputSchema: createRecipientToolSchema.shape,
    },
    async (args) => {
      const parsed = createRecipientToolSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "create_invoice_recipient");
      return mcpWriteTool(sb, "create_invoice_recipient", paramsOf(parsed.data), async () => {
        const existing = await findRecipientByOrgNumber(sb, parsed.data.org_number);
        if (existing) {
          return {
            id: existing.id,
            already_exists: true,
            message: `Organisationsnummer ${parsed.data.org_number} finns redan`,
          };
        }
        const saved = await saveInvoiceRecipient(sb, parsed.data);
        return { id: saved.id, already_exists: false, recipient: saved };
      });
    },
  );

  server.registerTool(
    "add_invoice_recipient_contact",
    {
      description: "Lägg till en kontaktperson på en fakturamottagare. Högst en primär kontakt.",
      inputSchema: addContactToolSchema.shape,
    },
    async (args) => {
      const parsed = addContactToolSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "add_invoice_recipient_contact");
      return mcpWriteTool(sb, "add_invoice_recipient_contact", paramsOf(parsed.data), async () => {
        return addInvoiceRecipientContact(sb, parsed.data);
      });
    },
  );

  server.registerTool(
    "update_invoice_recipient_contact",
    {
      description: "Uppdatera en kontaktperson. Sätt is_primary för att göra den primär.",
      inputSchema: updateContactToolSchema.shape,
    },
    async (args) => {
      const parsed = updateContactToolSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "update_invoice_recipient_contact");
      return mcpWriteTool(sb, "update_invoice_recipient_contact", paramsOf(parsed.data), async () => {
        return updateInvoiceRecipientContact(sb, parsed.data);
      });
    },
  );

  server.registerTool(
    "create_invoice_draft",
    {
      description:
        "Skapa ett fakturautkast. Belopp räknas på servern från unit_price_sek (exkl. moms). created_via sätts till mcp. Utfärdar inte fakturan. För ett mejlutkast: issue_invoice, sedan get_invoice_pdf.",
      inputSchema: createInvoiceDraftSchema.shape,
    },
    async (args) => {
      const parsed = createInvoiceDraftSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "create_invoice_draft");
      return mcpWriteTool(sb, "create_invoice_draft", paramsOf(parsed.data), async () => {
        const actor = await getMcpActorProfileId(sb);
        return createInvoiceDraft(sb, parsed.data, { createdVia: "mcp", createdBy: actor });
      });
    },
  );

  server.registerTool(
    "update_invoice_draft",
    {
      description:
        "Ändra ett fakturautkast (rader eller fält). Avvisas om fakturan inte längre är utkast. Utfärdar inte fakturan.",
      inputSchema: updateInvoiceDraftSchema.shape,
    },
    async (args) => {
      const parsed = updateInvoiceDraftSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "update_invoice_draft");
      return mcpWriteTool(sb, "update_invoice_draft", paramsOf(parsed.data), async () => {
        return updateInvoiceDraft(sb, parsed.data);
      });
    },
  );

  server.registerTool(
    "issue_invoice",
    {
      description:
        "Utfärda ett utkast. Tilldelar nästa löpnummer (YYYY-NNN) som aldrig återanvänds. Anropa när fakturan ska bifogas ett mejlutkast, och hämta sedan PDF:en med get_invoice_pdf. Skickar inget mejl. Makulering görs i admin.",
      inputSchema: invoiceIdSchema.shape,
    },
    async (args) => {
      const parsed = invoiceIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "issue_invoice");
      return mcpWriteTool(sb, "issue_invoice", paramsOf(parsed.data), async () => {
        return issueInvoice(sb, parsed.data.id);
      });
    },
  );

  server.registerTool(
    "get_invoice_pdf",
    {
      description:
        "Hämta fakturan som PDF att bifoga i ett mejlutkast. Textsvaret innehåller to_email, filnamn, belopp och pdf_base64. PDF:en följer också som fil. Skickar inget mejl. Ett utkast saknar fakturanummer: anropa issue_invoice först.",
      inputSchema: invoiceIdSchema.shape,
    },
    async (args) => {
      const parsed = invoiceIdSchema.safeParse(args);
      if (!parsed.success) return mcpErrorResult(zodMessage(parsed.error), "get_invoice_pdf");
      try {
        const row = await getInvoice(sb, parsed.data.id);
        if (!row) return mcpErrorResult("Fakturan hittades inte", "get_invoice_pdf");
        const sender = row.sender_snapshot ? null : await loadInvoiceSenderDefaults(sb);
        const pdf = renderInvoicePdf(row, sender);
        const attachment = invoiceEmailAttachment(row, pdf, sender);
        return mcpDocumentResult(attachment, {
          uri: `crowdvine://invoices/${row.id}/${attachment.filename}`,
          mimeType: "application/pdf",
          bytes: pdf,
        }, { tool: "get_invoice_pdf", rowCount: 1 });
      } catch (error) {
        return fail("get_invoice_pdf", error);
      }
    },
  );
}
