"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  getInvoiceRecipient,
  listInvoiceRecipients,
  saveInvoiceRecipient,
  type InvoiceRecipientRecord,
} from "@/lib/invoices/recipients";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type RecipientActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Okänt fel" };
}

export async function saveInvoiceRecipientAction(
  input: unknown,
): Promise<RecipientActionResult<InvoiceRecipientRecord>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Admin access required" };
  try {
    const data = await saveInvoiceRecipient(getSupabaseAdmin(), input);
    revalidatePath("/admin/users/business");
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function listInvoiceRecipientsAction(): Promise<
  RecipientActionResult<InvoiceRecipientRecord[]>
> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Admin access required" };
  try {
    const data = await listInvoiceRecipients(getSupabaseAdmin());
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function getInvoiceRecipientAction(
  id: string,
): Promise<RecipientActionResult<InvoiceRecipientRecord>> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Admin access required" };
  try {
    const data = await getInvoiceRecipient(getSupabaseAdmin(), id);
    if (!data) return { ok: false, error: "Fakturamottagaren hittades inte" };
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}
