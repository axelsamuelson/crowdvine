"use server";

import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { createDeliveryNote, type DeliveryNote } from "@/lib/delivery-notes/notes";
import {
  deliveryNoteEmailAttachment,
  renderDeliveryNotePdf,
} from "@/lib/delivery-notes/pdf";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type DeliveryNoteActionResult =
  | { ok: true; data: ReturnType<typeof deliveryNoteEmailAttachment> & { note: DeliveryNote } }
  | { ok: false; error: string };

/** Creates a delivery note from a saved invoice and returns the PDF for download. */
export async function createDeliveryNotePdfAction(
  invoiceId: string,
): Promise<DeliveryNoteActionResult> {
  const admin = await getCurrentAdmin();
  if (!admin) return { ok: false, error: "Admin access required" };
  try {
    const sb = getSupabaseAdmin();
    const note = await createDeliveryNote(
      sb,
      { invoice_id: invoiceId },
      { createdVia: "admin", createdBy: admin.id },
    );
    const pdf = renderDeliveryNotePdf(note);
    return { ok: true, data: { ...deliveryNoteEmailAttachment(note, pdf), note } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Okänt fel" };
  }
}
