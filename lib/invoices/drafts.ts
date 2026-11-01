import type { SupabaseClient } from "@supabase/supabase-js";
import { invoiceLockedMessage } from "@/lib/invoices/messages";
import { lineTotalOre, sekToOre, sumOre, vatOre } from "@/lib/invoices/money";
import { getInvoiceRecipient } from "@/lib/invoices/recipients";
import {
  createInvoiceDraftSchema,
  updateInvoiceDraftSchema,
  zodMessage,
  type invoiceLineInputSchema,
} from "@/lib/invoices/schemas";
import type { z } from "zod";

type LineInput = z.infer<typeof invoiceLineInputSchema>;

const oreField = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  throw new Error("Ogiltigt örebelopp");
};

const quantityField = (value: unknown): number => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(n)) throw new Error("Ogiltigt antal");
  return n;
};

export type SavedInvoiceLine = {
  id: string;
  invoice_id: string;
  position: number;
  wine_id: string | null;
  description: string;
  vintage: string | null;
  quantity: number;
  unit_price_ore: number;
  vat_rate: number;
  line_total_ore: number;
};

export type SavedInvoice = {
  id: string;
  invoice_number: string | null;
  status: "draft" | "issued" | "paid" | "void";
  recipient_id: string;
  recipient_snapshot: Record<string, unknown> | null;
  sender_snapshot: Record<string, unknown> | null;
  ship_to: Record<string, unknown> | null;
  invoice_date: string | null;
  delivery_date: string | null;
  payment_terms_days: number;
  due_date: string | null;
  currency: string;
  subtotal_ore: number;
  vat_ore: number;
  total_ore: number;
  notes: string | null;
  created_via: "admin" | "mcp";
  created_at: string;
  updated_at: string;
  issued_at: string | null;
  lines: SavedInvoiceLine[];
  recipient: {
    company_name: string;
    org_number: string;
    email: string;
    address: string;
    postal_code: string;
    city: string;
    primary_contact: {
      name: string;
      email: string | null;
      phone: string | null;
      title: string | null;
    } | null;
  } | null;
};

const INVOICE_SELECT = `
  id,
  invoice_number,
  status,
  recipient_id,
  recipient_snapshot,
  sender_snapshot,
  ship_to,
  invoice_date,
  delivery_date,
  payment_terms_days,
  due_date,
  currency,
  subtotal_ore,
  vat_ore,
  total_ore,
  notes,
  created_via,
  created_at,
  updated_at,
  issued_at,
  invoice_lines (
    id,
    invoice_id,
    position,
    wine_id,
    description,
    vintage,
    quantity,
    unit_price_ore,
    vat_rate,
    line_total_ore
  ),
  invoice_recipients (
    company_name,
    org_number,
    email,
    address,
    postal_code,
    city,
    invoice_recipient_contacts (
      name,
      email,
      phone,
      title,
      is_primary
    )
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

function parseLine(value: unknown): SavedInvoiceLine {
  const row = asRecord(value);
  if (!row) throw new Error("Ogiltig fakturarad");
  const id = readString(row, "id");
  const invoiceId = readString(row, "invoice_id");
  const description = readString(row, "description");
  if (!id || !invoiceId || !description) throw new Error("Ogiltig fakturarad");
  const position = oreField(row.position);
  const unit = oreField(row.unit_price_ore);
  const lineTotal = oreField(row.line_total_ore);
  if (position === null || unit === null || lineTotal === null) {
    throw new Error("Ogiltig fakturarad");
  }
  const vat = typeof row.vat_rate === "number"
    ? row.vat_rate
    : typeof row.vat_rate === "string"
      ? Number(row.vat_rate)
      : NaN;
  if (!Number.isFinite(vat)) throw new Error("Ogiltig momssats");
  const wineId = readNullableString(row, "wine_id");
  return {
    id,
    invoice_id: invoiceId,
    position,
    wine_id: wineId,
    description,
    vintage: readNullableString(row, "vintage"),
    quantity: quantityField(row.quantity),
    unit_price_ore: unit,
    vat_rate: vat,
    line_total_ore: lineTotal,
  };
}

function parseStatus(value: unknown): SavedInvoice["status"] {
  if (value === "draft" || value === "issued" || value === "paid" || value === "void") {
    return value;
  }
  throw new Error("Ogiltig fakturastatus");
}

function parseCreatedVia(value: unknown): SavedInvoice["created_via"] {
  if (value === "mcp") return "mcp";
  return "admin";
}

export function parseSavedInvoice(value: unknown): SavedInvoice {
  const row = asRecord(value);
  if (!row) throw new Error("Ogiltig faktura");
  const id = readString(row, "id");
  const recipientId = readString(row, "recipient_id");
  if (!id || !recipientId) throw new Error("Ogiltig faktura");
  const lines = (Array.isArray(row.invoice_lines) ? row.invoice_lines : [])
    .map((line) => parseLine(line))
    .sort((a, b) => a.position - b.position);
  const recipientRow = asRecord(row.invoice_recipients);
  let recipient: SavedInvoice["recipient"] = null;
  if (recipientRow) {
    const contacts = Array.isArray(recipientRow.invoice_recipient_contacts)
      ? recipientRow.invoice_recipient_contacts
      : [];
    const primaryRaw = contacts
      .map((contact) => asRecord(contact))
      .find((contact) => contact?.is_primary === true);
    recipient = {
      company_name: readString(recipientRow, "company_name"),
      org_number: readString(recipientRow, "org_number"),
      email: readString(recipientRow, "email"),
      address: readString(recipientRow, "address"),
      postal_code: readString(recipientRow, "postal_code"),
      city: readString(recipientRow, "city"),
      primary_contact: primaryRaw
        ? {
            name: readString(primaryRaw, "name"),
            email: readNullableString(primaryRaw, "email"),
            phone: readNullableString(primaryRaw, "phone"),
            title: readNullableString(primaryRaw, "title"),
          }
        : null,
    };
  }
  return {
    id,
    invoice_number: readNullableString(row, "invoice_number"),
    status: parseStatus(row.status),
    recipient_id: recipientId,
    recipient_snapshot: asRecord(row.recipient_snapshot),
    sender_snapshot: asRecord(row.sender_snapshot),
    ship_to: asRecord(row.ship_to),
    invoice_date: readNullableString(row, "invoice_date"),
    delivery_date: readNullableString(row, "delivery_date"),
    payment_terms_days: oreField(row.payment_terms_days) ?? 30,
    due_date: readNullableString(row, "due_date"),
    currency: readString(row, "currency") || "SEK",
    subtotal_ore: oreField(row.subtotal_ore) ?? 0,
    vat_ore: oreField(row.vat_ore) ?? 0,
    total_ore: oreField(row.total_ore) ?? 0,
    notes: readNullableString(row, "notes"),
    created_via: parseCreatedVia(row.created_via),
    created_at: readString(row, "created_at"),
    updated_at: readString(row, "updated_at"),
    issued_at: readNullableString(row, "issued_at"),
    lines,
    recipient,
  };
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

type ResolvedLine = {
  wine_id: string | null;
  description: string;
  vintage: string | null;
  quantity: number;
  unit_price_ore: number;
  vat_rate: number;
  line_total_ore: number;
};

async function resolveLines(
  sb: SupabaseClient,
  lines: LineInput[],
): Promise<ResolvedLine[]> {
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
        vintage: typeof vintage === "string" ? vintage : vintage === null ? null : String(vintage ?? ""),
        producer_id: readNullableString(record, "producer_id"),
      });
    }
  }

  const producerIds = [...new Set(
    [...wineById.values()].flatMap((wine) => (wine.producer_id ? [wine.producer_id] : [])),
  )];
  const producerName = new Map<string, string>();
  if (producerIds.length > 0) {
    const { data, error } = await sb
      .from("producers")
      .select("id, name")
      .in("id", producerIds);
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
    const unitPriceOre = sekToOre(line.unit_price_sek);
    const total = lineTotalOre(line.quantity, unitPriceOre);
    const rate = line.vat_rate ?? 25;
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
        unit_price_ore: unitPriceOre,
        vat_rate: rate,
        line_total_ore: total,
      };
    }
    return {
      wine_id: null,
      description: line.description?.trim() ?? "",
      vintage: null,
      quantity: line.quantity,
      unit_price_ore: unitPriceOre,
      vat_rate: rate,
      line_total_ore: total,
    };
  });
}

function totalsOf(lines: ResolvedLine[]): { subtotal_ore: number; vat_ore: number; total_ore: number } {
  const subtotal = sumOre(lines.map((line) => line.line_total_ore));
  const vat = sumOre(lines.map((line) => vatOre(line.line_total_ore, line.vat_rate)));
  return { subtotal_ore: subtotal, vat_ore: vat, total_ore: subtotal + vat };
}

async function requireDraft(
  sb: SupabaseClient,
  invoiceId: string,
): Promise<SavedInvoice> {
  const invoice = await getInvoice(sb, invoiceId);
  if (!invoice) throw new Error("Fakturan hittades inte");
  if (invoice.status !== "draft") {
    throw new Error(invoiceLockedMessage(invoice.invoice_number, invoice.status));
  }
  return invoice;
}

export async function getInvoice(
  sb: SupabaseClient,
  id: string,
): Promise<SavedInvoice | null> {
  const { data, error } = await sb
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("id", id)
    .maybeSingle();
  assertNoError(error);
  if (!data) return null;
  return parseSavedInvoice(data);
}

export async function listInvoices(
  sb: SupabaseClient,
  filters: {
    status?: SavedInvoice["status"];
    recipient_id?: string;
    from?: string;
    to?: string;
  },
): Promise<SavedInvoice[]> {
  let query = sb.from("invoices").select(INVOICE_SELECT).order("created_at", { ascending: false });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.recipient_id) query = query.eq("recipient_id", filters.recipient_id);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  const { data, error } = await query;
  assertNoError(error);
  return (Array.isArray(data) ? data : []).map((row) => parseSavedInvoice(row));
}

export async function createInvoiceDraft(
  sb: SupabaseClient,
  input: unknown,
  options: { createdVia: "admin" | "mcp"; createdBy: string | null },
): Promise<SavedInvoice> {
  const parsed = createInvoiceDraftSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;
  const recipient = await getInvoiceRecipient(sb, body.recipient_id);
  if (!recipient) throw new Error("Fakturamottagaren hittades inte");
  const lines = await resolveLines(sb, body.lines);
  const totals = totalsOf(lines);
  const { data, error } = await sb
    .from("invoices")
    .insert({
      recipient_id: body.recipient_id,
      delivery_date: body.delivery_date ?? null,
      payment_terms_days: body.payment_terms_days ?? 30,
      ship_to: body.ship_to ?? null,
      notes: body.notes ?? null,
      currency: "SEK",
      created_via: options.createdVia,
      created_by: options.createdBy,
      subtotal_ore: totals.subtotal_ore,
      vat_ore: totals.vat_ore,
      total_ore: totals.total_ore,
    })
    .select("id")
    .single();
  assertNoError(error);
  const id = readId(data);
  await insertLines(sb, id, lines);
  const saved = await getInvoice(sb, id);
  if (!saved) throw new Error("Kunde inte läsa fakturan efter sparning");

  try {
    const {
      logB2bOrderCreated,
      resolveIsFirstB2bOrder,
      sumBottleQuantities,
    } = await import("@/lib/analytics/b2b-events");
    const isFirstOrder = await resolveIsFirstB2bOrder(sb, {
      recipientId: body.recipient_id,
      excludeInvoiceId: id,
    });
    await logB2bOrderCreated({
      invoiceId: id,
      orderType: "offline",
      bottles: sumBottleQuantities(lines),
      amountSek: Math.round(totals.total_ore) / 100,
      recipientId: body.recipient_id,
      isFirstOrder,
      userId: options.createdBy,
    });
  } catch (e) {
    console.error("b2b_order_created (invoice draft):", e);
  }

  return saved;
}

export async function updateInvoiceDraft(
  sb: SupabaseClient,
  input: unknown,
): Promise<SavedInvoice> {
  const parsed = updateInvoiceDraftSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;
  await requireDraft(sb, body.invoice_id);

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.recipient_id !== undefined) {
    const recipient = await getInvoiceRecipient(sb, body.recipient_id);
    if (!recipient) throw new Error("Fakturamottagaren hittades inte");
    patch.recipient_id = body.recipient_id;
  }
  if (body.delivery_date !== undefined) patch.delivery_date = body.delivery_date;
  if (body.payment_terms_days !== undefined) patch.payment_terms_days = body.payment_terms_days;
  if (body.ship_to !== undefined) patch.ship_to = body.ship_to;
  if (body.notes !== undefined) patch.notes = body.notes;

  if (body.lines) {
    const lines = await resolveLines(sb, body.lines);
    const { error: linesError } = await sb.rpc("replace_invoice_draft_lines", {
      p_invoice_id: body.invoice_id,
      p_lines: lines.map((line) => ({
        wine_id: line.wine_id,
        description: line.description,
        vintage: line.vintage,
        quantity: line.quantity,
        unit_price_ore: line.unit_price_ore,
        vat_rate: line.vat_rate,
      })),
    });
    assertNoError(linesError);
  }

  const { error } = await sb.from("invoices").update(patch).eq("id", body.invoice_id);
  assertNoError(error);
  const saved = await getInvoice(sb, body.invoice_id);
  if (!saved) throw new Error("Kunde inte läsa fakturan efter uppdatering");
  return saved;
}

async function insertLines(
  sb: SupabaseClient,
  invoiceId: string,
  lines: ResolvedLine[],
): Promise<void> {
  const rows = lines.map((line, index) => ({
    invoice_id: invoiceId,
    position: index + 1,
    wine_id: line.wine_id,
    description: line.description,
    vintage: line.vintage,
    quantity: line.quantity,
    unit_price_ore: line.unit_price_ore,
    vat_rate: line.vat_rate,
    line_total_ore: line.line_total_ore,
  }));
  const { error } = await sb.from("invoice_lines").insert(rows);
  assertNoError(error);
}

export async function issueInvoice(
  sb: SupabaseClient,
  invoiceId: string,
): Promise<SavedInvoice> {
  await requireDraft(sb, invoiceId);
  const { error } = await sb.rpc("issue_invoice", { p_invoice_id: invoiceId });
  assertNoError(error);
  const saved = await getInvoice(sb, invoiceId);
  if (!saved) throw new Error("Kunde inte läsa fakturan efter utfärdande");

  try {
    const {
      logB2bQuoteSent,
      sumBottleQuantities,
      wineIdsFromLines,
    } = await import("@/lib/analytics/b2b-events");
    await logB2bQuoteSent({
      recipientId: saved.recipient_id,
      wineIds: wineIdsFromLines(saved.lines),
      bottles: sumBottleQuantities(saved.lines),
      amountSek: Math.round(saved.total_ore) / 100,
      invoiceId: saved.id,
    });
  } catch (e) {
    console.error("b2b_quote_sent:", e);
  }

  return saved;
}

export async function deleteInvoiceDraft(
  sb: SupabaseClient,
  invoiceId: string,
): Promise<void> {
  await requireDraft(sb, invoiceId);
  const { error } = await sb.from("invoices").delete().eq("id", invoiceId);
  assertNoError(error);
}

function readId(value: unknown): string {
  const row = asRecord(value);
  const id = row ? readString(row, "id") : "";
  if (!id) throw new Error("Svaret saknade id");
  return id;
}
