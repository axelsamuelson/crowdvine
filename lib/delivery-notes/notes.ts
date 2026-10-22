import type { SupabaseClient } from "@supabase/supabase-js";
import { getInvoice } from "@/lib/invoices/drafts";
import { getInvoiceRecipient } from "@/lib/invoices/recipients";
import type { InvoiceSenderDefaults } from "@/lib/invoices/sender";
import { loadInvoiceSenderDefaults } from "@/lib/invoices/sender";
import {
  createDeliveryNoteSchema,
  zodMessage,
  type deliveryLineInputSchema,
} from "@/lib/delivery-notes/schemas";
import type { z } from "zod";

type LineInput = z.infer<typeof deliveryLineInputSchema>;

export type DeliveryNoteLine = {
  id: string;
  position: number;
  wine_id: string | null;
  description: string;
  vintage: string | null;
  quantity: number;
};

export type DeliveryNote = {
  id: string;
  note_number: string;
  invoice_id: string | null;
  invoice_number: string | null;
  recipient_id: string;
  recipient_snapshot: Record<string, unknown>;
  sender_snapshot: Record<string, unknown>;
  ship_to: Record<string, unknown> | null;
  delivery_date: string;
  notes: string | null;
  created_via: "admin" | "mcp";
  created_at: string;
  lines: DeliveryNoteLine[];
};

const NOTE_SELECT = `
  id,
  note_number,
  invoice_id,
  recipient_id,
  recipient_snapshot,
  sender_snapshot,
  ship_to,
  delivery_date,
  notes,
  created_via,
  created_at,
  delivery_note_lines (
    id,
    position,
    wine_id,
    description,
    vintage,
    quantity
  ),
  invoices (
    invoice_number
  )
`;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function quantityOf(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0) throw new Error("Ogiltigt antal");
  return n;
}

function todayStockholm(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(new Date());
}

function embeddedInvoiceNumber(value: unknown): string | null {
  const row = Array.isArray(value) ? asRecord(value[0]) : asRecord(value);
  if (!row) return null;
  const number = readString(row, "invoice_number").trim();
  return number || null;
}

export function parseDeliveryNote(value: unknown): DeliveryNote {
  const row = asRecord(value);
  if (!row) throw new Error("Ogiltig leveranssedel");
  const id = readString(row, "id");
  const noteNumber = readString(row, "note_number");
  const recipientId = readString(row, "recipient_id");
  const deliveryDate = readString(row, "delivery_date").slice(0, 10);
  if (!id || !noteNumber || !recipientId || !deliveryDate) throw new Error("Ogiltig leveranssedel");
  const recipient = asRecord(row.recipient_snapshot);
  const sender = asRecord(row.sender_snapshot);
  if (!recipient || !sender) throw new Error("Ogiltig leveranssedel");
  const lines = (Array.isArray(row.delivery_note_lines) ? row.delivery_note_lines : [])
    .map((line) => {
      const item = asRecord(line);
      if (!item) throw new Error("Ogiltig leveransrad");
      const lineId = readString(item, "id");
      const description = readString(item, "description");
      const position = quantityOf(item.position);
      if (!lineId || !description) throw new Error("Ogiltig leveransrad");
      return {
        id: lineId,
        position,
        wine_id: readNullableString(item, "wine_id"),
        description,
        vintage: readNullableString(item, "vintage"),
        quantity: quantityOf(item.quantity),
      };
    })
    .sort((a, b) => a.position - b.position);
  const via = row.created_via === "mcp" ? "mcp" : "admin";
  return {
    id,
    note_number: noteNumber,
    invoice_id: readNullableString(row, "invoice_id"),
    invoice_number: embeddedInvoiceNumber(row.invoices),
    recipient_id: recipientId,
    recipient_snapshot: recipient,
    sender_snapshot: sender,
    ship_to: asRecord(row.ship_to),
    delivery_date: deliveryDate,
    notes: readNullableString(row, "notes"),
    created_via: via,
    created_at: readString(row, "created_at"),
    lines,
  };
}

async function resolveLines(
  sb: SupabaseClient,
  lines: LineInput[],
): Promise<Array<{ wine_id: string | null; description: string; vintage: string | null; quantity: number }>> {
  const wineIds = [...new Set(lines.flatMap((line) => (line.wine_id ? [line.wine_id] : [])))];
  const wineById = new Map<string, { wine_name: string; vintage: string | null; producer_id: string | null }>();
  if (wineIds.length > 0) {
    const { data, error } = await sb
      .from("wines")
      .select("id, wine_name, vintage, producer_id")
      .in("id", wineIds);
    assertNoError(error);
    for (const row of Array.isArray(data) ? data : []) {
      const record = asRecord(row);
      if (!record) continue;
      const id = readString(record, "id");
      if (!id) continue;
      const vintage = record.vintage;
      wineById.set(id, {
        wine_name: readString(record, "wine_name"),
        vintage: typeof vintage === "string" ? vintage : vintage == null ? null : String(vintage),
        producer_id: readNullableString(record, "producer_id"),
      });
    }
  }
  const producerIds = [...new Set([...wineById.values()].flatMap((wine) => (wine.producer_id ? [wine.producer_id] : [])))];
  const producerName = new Map<string, string>();
  if (producerIds.length > 0) {
    const { data, error } = await sb.from("producers").select("id, name").in("id", producerIds);
    assertNoError(error);
    for (const row of Array.isArray(data) ? data : []) {
      const record = asRecord(row);
      if (!record) continue;
      const id = readString(record, "id");
      const name = readString(record, "name");
      if (id && name) producerName.set(id, name);
    }
  }
  return lines.map((line) => {
    if (line.wine_id) {
      const wine = wineById.get(line.wine_id);
      if (!wine) throw new Error(`Vin ${line.wine_id} hittades inte`);
      const producer = wine.producer_id ? producerName.get(wine.producer_id) : undefined;
      const description = [producer, wine.wine_name].filter((part) => part && part.trim()).join(", ");
      if (!description) throw new Error(`Vin ${line.wine_id} saknar namn`);
      return {
        wine_id: line.wine_id,
        description,
        vintage: wine.vintage,
        quantity: line.quantity,
      };
    }
    const vintage = line.vintage?.trim() ? line.vintage.trim() : null;
    return {
      wine_id: null,
      description: line.description?.trim() ?? "",
      vintage,
      quantity: line.quantity,
    };
  });
}

function senderSnapshot(sender: InvoiceSenderDefaults | null): Record<string, unknown> {
  return {
    company_name: sender?.company_name ?? "",
    org_number: sender?.org_number ?? "",
    vat_number: sender?.vat_number ?? "",
    from_name: sender?.from_name ?? "",
    from_email: sender?.from_email ?? "",
    from_address: sender?.from_address ?? "",
    from_postal_code: sender?.from_postal_code ?? "",
    from_city: sender?.from_city ?? "",
    from_country: sender?.from_country ?? "",
    default_footer: sender?.default_footer ?? "",
  };
}

function recipientSnapshotFromLive(recipient: {
  company_name: string;
  org_number: string;
  address: string;
  postal_code: string;
  city: string;
  email: string;
  primary_contact: { name: string; email: string | null; phone: string | null; title: string | null } | null;
}): Record<string, unknown> {
  return {
    company_name: recipient.company_name,
    org_number: recipient.org_number,
    address: recipient.address,
    postal_code: recipient.postal_code,
    city: recipient.city,
    email: recipient.email,
    primary_contact: recipient.primary_contact
      ? {
          name: recipient.primary_contact.name,
          email: recipient.primary_contact.email,
          phone: recipient.primary_contact.phone,
          title: recipient.primary_contact.title,
        }
      : null,
  };
}

async function nextNumber(sb: SupabaseClient): Promise<string> {
  const { data, error } = await sb.rpc("next_delivery_note_number");
  assertNoError(error);
  if (typeof data !== "string" || !data.trim()) throw new Error("Kunde inte tilldela leveranssedelsnummer");
  return data;
}

export async function getDeliveryNote(sb: SupabaseClient, id: string): Promise<DeliveryNote | null> {
  const { data, error } = await sb.from("delivery_notes").select(NOTE_SELECT).eq("id", id).maybeSingle();
  assertNoError(error);
  if (!data) return null;
  return parseDeliveryNote(data);
}

export async function listDeliveryNotes(
  sb: SupabaseClient,
  filters: { recipient_id?: string; invoice_id?: string },
): Promise<DeliveryNote[]> {
  let query = sb.from("delivery_notes").select(NOTE_SELECT).order("created_at", { ascending: false });
  if (filters.recipient_id) query = query.eq("recipient_id", filters.recipient_id);
  if (filters.invoice_id) query = query.eq("invoice_id", filters.invoice_id);
  const { data, error } = await query;
  assertNoError(error);
  return (Array.isArray(data) ? data : []).map((row) => parseDeliveryNote(row));
}

export async function createDeliveryNote(
  sb: SupabaseClient,
  input: unknown,
  options: { createdVia: "admin" | "mcp"; createdBy: string | null },
): Promise<DeliveryNote> {
  const parsed = createDeliveryNoteSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;

  let recipientId = body.recipient_id ?? "";
  let invoiceId: string | null = null;
  let recipientRecord: Record<string, unknown> | null = null;
  let senderRecord: Record<string, unknown> | null = null;
  let shipTo: Record<string, unknown> | null = body.ship_to ?? null;
  let deliveryDate = body.delivery_date ?? todayStockholm();
  let notes = body.notes ?? null;
  let resolved: Array<{ wine_id: string | null; description: string; vintage: string | null; quantity: number }>;

  if (body.invoice_id) {
    const invoice = await getInvoice(sb, body.invoice_id);
    if (!invoice) throw new Error("Fakturan hittades inte");
    if (invoice.status === "void") {
      throw new Error(
        invoice.invoice_number
          ? `Faktura ${invoice.invoice_number} är makulerad och kan inte få en leveranssedel`
          : "Fakturan är makulerad och kan inte få en leveranssedel",
      );
    }
    if (!body.lines && invoice.lines.length === 0) {
      throw new Error("Fakturan saknar rader");
    }
    invoiceId = invoice.id;
    recipientId = invoice.recipient_id;
    deliveryDate = body.delivery_date ?? invoice.delivery_date ?? todayStockholm();
    if (body.notes === undefined) notes = invoice.notes;
    if (body.ship_to === undefined) shipTo = invoice.ship_to;
    if (invoice.status !== "draft" && invoice.recipient_snapshot) {
      recipientRecord = invoice.recipient_snapshot;
    }
    if (invoice.status !== "draft" && invoice.sender_snapshot) {
      senderRecord = invoice.sender_snapshot;
    }
    resolved = body.lines
      ? await resolveLines(sb, body.lines)
      : invoice.lines.map((line) => ({
          wine_id: line.wine_id,
          description: line.description,
          vintage: line.vintage,
          quantity: line.quantity,
        }));
  } else {
    resolved = await resolveLines(sb, body.lines ?? []);
  }

  if (!recipientRecord) {
    const recipient = await getInvoiceRecipient(sb, recipientId);
    if (!recipient) throw new Error("Fakturamottagaren hittades inte");
    recipientRecord = recipientSnapshotFromLive(recipient);
  }
  if (!senderRecord) {
    senderRecord = senderSnapshot(await loadInvoiceSenderDefaults(sb));
  }
  if (resolved.length === 0) throw new Error("Leveranssedeln behöver minst en rad");

  const noteNumber = await nextNumber(sb);
  const { data, error } = await sb
    .from("delivery_notes")
    .insert({
      note_number: noteNumber,
      invoice_id: invoiceId,
      recipient_id: recipientId,
      recipient_snapshot: recipientRecord,
      sender_snapshot: senderRecord,
      ship_to: shipTo,
      delivery_date: deliveryDate,
      notes,
      created_by: options.createdBy,
      created_via: options.createdVia,
    })
    .select("id")
    .single();
  assertNoError(error);
  const created = asRecord(data);
  const id = created ? readString(created, "id") : "";
  if (!id) throw new Error("Kunde inte läsa leveranssedeln efter sparning");

  const { error: lineError } = await sb.from("delivery_note_lines").insert(
    resolved.map((line, index) => ({
      delivery_note_id: id,
      position: index + 1,
      wine_id: line.wine_id,
      description: line.description,
      vintage: line.vintage,
      quantity: line.quantity,
    })),
  );
  assertNoError(lineError);

  const saved = await getDeliveryNote(sb, id);
  if (!saved) throw new Error("Kunde inte läsa leveranssedeln efter sparning");
  return saved;
}
