"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import {
  createInvoiceDraft,
  deleteInvoiceDraft,
  getInvoice,
  issueInvoice,
  listInvoices,
  updateInvoiceDraft,
  type SavedInvoice,
} from "@/lib/invoices/drafts";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type InvoiceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  return { ok: false, error: error instanceof Error ? error.message : "Okänt fel" };
}

async function adminGate(): Promise<
  | { ok: true; sb: ReturnType<typeof getSupabaseAdmin>; adminId: string }
  | { ok: false; error: string }
> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Admin access required" };
  return { ok: true, sb: getSupabaseAdmin(), adminId: admin.id };
}

export async function listSavedInvoicesAction(): Promise<InvoiceActionResult<SavedInvoice[]>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    return { ok: true, data: await listInvoices(gate.sb, {}) };
  } catch (error) {
    return fail(error);
  }
}

export async function getSavedInvoiceAction(
  invoiceId: string,
): Promise<InvoiceActionResult<SavedInvoice>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    const data = await getInvoice(gate.sb, invoiceId);
    if (!data) return { ok: false, error: "Fakturan hittades inte" };
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function saveInvoiceDraftAction(
  input: unknown,
): Promise<InvoiceActionResult<SavedInvoice>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    const data = await createInvoiceDraft(gate.sb, input, {
      createdVia: "admin",
      createdBy: gate.adminId,
    });
    revalidatePath("/admin/bookings/dirty-wine");
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function updateInvoiceDraftAction(
  input: unknown,
): Promise<InvoiceActionResult<SavedInvoice>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    const data = await updateInvoiceDraft(gate.sb, input);
    revalidatePath("/admin/bookings/dirty-wine");
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function issueInvoiceAction(
  invoiceId: string,
): Promise<InvoiceActionResult<SavedInvoice>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    const data = await issueInvoice(gate.sb, invoiceId);
    revalidatePath("/admin/bookings/dirty-wine");
    return { ok: true, data };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteInvoiceDraftAction(
  invoiceId: string,
): Promise<InvoiceActionResult<{ id: string }>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;
  try {
    await deleteInvoiceDraft(gate.sb, invoiceId);
    revalidatePath("/admin/bookings/dirty-wine");
    return { ok: true, data: { id: invoiceId } };
  } catch (error) {
    return fail(error);
  }
}
