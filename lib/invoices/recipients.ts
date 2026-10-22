import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addContactToolSchema,
  contactRowSchema,
  recipientRowSchema,
  saveInvoiceRecipientSchema,
  updateContactToolSchema,
  zodMessage,
  type InvoiceContact,
  type InvoiceRecipientRecord,
  type SaveInvoiceRecipientInput,
} from "@/lib/invoices/schemas";

const RECIPIENT_SELECT = `
  id,
  created_at,
  updated_at,
  profile_id,
  company_name,
  email,
  address,
  postal_code,
  city,
  org_number,
  invoice_recipient_contacts (
    id,
    recipient_id,
    name,
    email,
    phone,
    title,
    is_primary,
    created_at
  )
`;

function parseRecipient(value: unknown): InvoiceRecipientRecord {
  const parsed = recipientRowSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(zodMessage(parsed.error));
  }
  const contacts = [...parsed.data.invoice_recipient_contacts].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
  const primary = contacts.find((contact) => contact.is_primary) ?? null;
  return {
    ...parsed.data,
    contacts,
    primary_contact: primary
      ? {
          name: primary.name,
          email: primary.email,
          phone: primary.phone,
          title: primary.title,
        }
      : null,
  };
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export function orgDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export async function listInvoiceRecipients(
  sb: SupabaseClient,
  query?: string,
): Promise<InvoiceRecipientRecord[]> {
  const { data, error } = await sb
    .from("invoice_recipients")
    .select(RECIPIENT_SELECT)
    .order("company_name");
  assertNoError(error);
  const rows = zArray(data).map((row) => parseRecipient(row));
  const q = query?.trim().toLowerCase() ?? "";
  if (!q) return rows;
  const digits = orgDigits(q);
  return rows.filter((row) => {
    const name = row.company_name.toLowerCase();
    const org = row.org_number.toLowerCase();
    const orgOnlyDigits = orgDigits(row.org_number);
    return (
      name.includes(q) ||
      org.includes(q) ||
      (digits.length > 0 && orgOnlyDigits.includes(digits))
    );
  });
}

export async function getInvoiceRecipient(
  sb: SupabaseClient,
  id: string,
): Promise<InvoiceRecipientRecord | null> {
  const { data, error } = await sb
    .from("invoice_recipients")
    .select(RECIPIENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  assertNoError(error);
  if (!data) return null;
  return parseRecipient(data);
}

export async function findRecipientByOrgNumber(
  sb: SupabaseClient,
  orgNumber: string,
): Promise<InvoiceRecipientRecord | null> {
  const digits = orgDigits(orgNumber);
  if (!digits) return null;
  const rows = await listInvoiceRecipients(sb);
  return rows.find((row) => orgDigits(row.org_number) === digits) ?? null;
}

export async function saveInvoiceRecipient(
  sb: SupabaseClient,
  input: unknown,
): Promise<InvoiceRecipientRecord> {
  const parsed = saveInvoiceRecipientSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;

  const recipientFields = {
    company_name: body.company_name,
    email: body.email,
    address: body.address,
    postal_code: body.postal_code,
    city: body.city,
    org_number: body.org_number,
    profile_id: body.profile_id,
    updated_at: new Date().toISOString(),
  };

  let recipientId = body.id ?? null;
  if (recipientId) {
    const { error } = await sb
      .from("invoice_recipients")
      .update(recipientFields)
      .eq("id", recipientId);
    assertNoError(error);
  } else {
    const { data, error } = await sb
      .from("invoice_recipients")
      .insert(recipientFields)
      .select("id")
      .single();
    assertNoError(error);
    recipientId = readId(data);
  }

  await replaceContacts(sb, recipientId, body.contacts);
  const saved = await getInvoiceRecipient(sb, recipientId);
  if (!saved) throw new Error("Kunde inte läsa mottagaren efter sparning");
  return saved;
}

async function replaceContacts(
  sb: SupabaseClient,
  recipientId: string,
  contacts: SaveInvoiceRecipientInput["contacts"],
): Promise<void> {
  const { data: existing, error: existingError } = await sb
    .from("invoice_recipient_contacts")
    .select("id")
    .eq("recipient_id", recipientId);
  assertNoError(existingError);

  const existingIds = new Set(zArray(existing).map((row) => readId(row)));
  const kept = new Set(
    contacts.flatMap((contact) =>
      contact.id && existingIds.has(contact.id) ? [contact.id] : [],
    ),
  );
  const removeIds = [...existingIds].filter((id) => !kept.has(id));

  if (removeIds.length > 0) {
    const { error } = await sb
      .from("invoice_recipient_contacts")
      .delete()
      .in("id", removeIds);
    assertNoError(error);
  }

  const { error: clearError } = await sb
    .from("invoice_recipient_contacts")
    .update({ is_primary: false })
    .eq("recipient_id", recipientId);
  assertNoError(clearError);

  if (contacts.length === 0) return;

  const rows = contacts.map((contact) => ({
    id: contact.id && existingIds.has(contact.id) ? contact.id : crypto.randomUUID(),
    recipient_id: recipientId,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    is_primary: contact.is_primary,
  }));

  const { error } = await sb
    .from("invoice_recipient_contacts")
    .upsert(rows, { onConflict: "id" });
  assertNoError(error);
}

export async function addInvoiceRecipientContact(
  sb: SupabaseClient,
  input: unknown,
): Promise<InvoiceContact> {
  const parsed = addContactToolSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;
  const recipient = await getInvoiceRecipient(sb, body.recipient_id);
  if (!recipient) throw new Error("Fakturamottagaren hittades inte");

  if (body.is_primary) {
    const { error } = await sb
      .from("invoice_recipient_contacts")
      .update({ is_primary: false })
      .eq("recipient_id", body.recipient_id);
    assertNoError(error);
  }

  const { data, error } = await sb
    .from("invoice_recipient_contacts")
    .insert({
      recipient_id: body.recipient_id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      title: body.title,
      is_primary: body.is_primary,
    })
    .select("id, recipient_id, name, email, phone, title, is_primary, created_at")
    .single();
  assertNoError(error);
  const row = contactRowSchema.safeParse(data);
  if (!row.success) throw new Error(zodMessage(row.error));
  return row.data;
}

export async function updateInvoiceRecipientContact(
  sb: SupabaseClient,
  input: unknown,
): Promise<InvoiceContact> {
  const parsed = updateContactToolSchema.safeParse(input);
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const body = parsed.data;

  const { data: current, error: currentError } = await sb
    .from("invoice_recipient_contacts")
    .select("id, recipient_id, name, email, phone, title, is_primary, created_at")
    .eq("id", body.contact_id)
    .maybeSingle();
  assertNoError(currentError);
  const existing = contactRowSchema.safeParse(current);
  if (!existing.success || !current) {
    throw new Error("Kontaktpersonen hittades inte");
  }

  if (body.is_primary === true) {
    const { error } = await sb
      .from("invoice_recipient_contacts")
      .update({ is_primary: false })
      .eq("recipient_id", existing.data.recipient_id);
    assertNoError(error);
  }

  const patch: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    is_primary?: boolean;
  } = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.email !== undefined) patch.email = body.email;
  if (body.phone !== undefined) patch.phone = body.phone;
  if (body.title !== undefined) patch.title = body.title;
  if (body.is_primary !== undefined) patch.is_primary = body.is_primary;

  const { data, error } = await sb
    .from("invoice_recipient_contacts")
    .update(patch)
    .eq("id", body.contact_id)
    .select("id, recipient_id, name, email, phone, title, is_primary, created_at")
    .single();
  assertNoError(error);
  const row = contactRowSchema.safeParse(data);
  if (!row.success) throw new Error(zodMessage(row.error));
  return row.data;
}

function zArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readId(value: unknown): string {
  if (!value || typeof value !== "object" || !("id" in value)) {
    throw new Error("Svaret saknade id");
  }
  const id = value.id;
  if (typeof id !== "string") throw new Error("Svaret saknade id");
  return id;
}
