import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import {
  getExtractedRowById,
  updateExtractedRow,
  createExtractionFeedback,
} from "@/lib/menu-extraction/db";

type PatchBody = {
  updates: Record<string, unknown>;
  original: Record<string, unknown>;
  document_id: string;
  notes?: string;
};

/** PATCH /api/admin/menu-extraction/rows/:rowId — update row + append menu_extraction_feedback. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rowId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { rowId } = await params;
    const body = (await request.json()) as PatchBody;
    const documentId =
      typeof body.document_id === "string" ? body.document_id.trim() : "";
    if (!documentId) {
      return NextResponse.json({ error: "document_id required" }, { status: 400 });
    }

    const row = await getExtractedRowById(rowId);
    if (!row || row.document_id !== documentId) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    const updatesRaw = body.updates ?? {};
    const toUpdate: Parameters<typeof updateExtractedRow>[1] = {};

    const num = (v: unknown): number | null =>
      v === null || v === "" || v === undefined ? null : Number(v);
    if ("producer" in updatesRaw)
      toUpdate.producer =
        updatesRaw.producer === null ? null : String(updatesRaw.producer ?? "");
    if ("wine_name" in updatesRaw)
      toUpdate.wine_name =
        updatesRaw.wine_name === null ? null : String(updatesRaw.wine_name ?? "");
    if ("vintage" in updatesRaw)
      toUpdate.vintage =
        updatesRaw.vintage === null ? null : String(updatesRaw.vintage ?? "");
    if ("region" in updatesRaw)
      toUpdate.region =
        updatesRaw.region === null ? null : String(updatesRaw.region ?? "");
    if ("country" in updatesRaw)
      toUpdate.country =
        updatesRaw.country === null ? null : String(updatesRaw.country ?? "");
    if ("price_glass" in updatesRaw) toUpdate.price_glass = num(updatesRaw.price_glass);
    if ("price_bottle" in updatesRaw) toUpdate.price_bottle = num(updatesRaw.price_bottle);
    if ("price_other" in updatesRaw) toUpdate.price_other = num(updatesRaw.price_other);
    if (typeof updatesRaw.needs_review === "boolean") {
      toUpdate.needs_review = updatesRaw.needs_review;
      if (updatesRaw.needs_review === false) toUpdate.review_reasons = null;
    }
    if (Array.isArray(updatesRaw.review_reasons))
      toUpdate.review_reasons = updatesRaw.review_reasons as string[];

    const original = (body.original ?? {}) as Record<string, unknown>;
    const correctedPayload = { ...original, ...toUpdate };

    const updated = await updateExtractedRow(rowId, toUpdate);

    await createExtractionFeedback({
      rowId,
      documentId,
      originalPrediction: original as Record<string, unknown>,
      correctedPayload: correctedPayload as Record<string, unknown>,
      errorTypes: toUpdate.needs_review === false ? ["manual_review_cleared"] : undefined,
      correctedBy: admin.id,
      notes: typeof body.notes === "string" ? body.notes : null,
    });

    return NextResponse.json({ row: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    console.error("[menu-extraction] PATCH /rows/[rowId] error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}
