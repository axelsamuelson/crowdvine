import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth-server";
import { getMenuDocumentById, updateMenuDocument } from "@/lib/menu-extraction/db";
import { extractTextFromPdfBuffer } from "@/lib/menu-extraction/pdf-extractor";
import { getPdfBufferFromStorage } from "@/lib/menu-extraction/storage";

/**
 * POST /api/admin/menu-extraction/documents/:id/extract-text
 * Re-extract raw text from the stored PDF and save to document.raw_text.
 * Use when raw_text is missing (e.g. document created before text extraction, or retry after fix).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const document = await getMenuDocumentById(id);
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    const filePath = document.file_path?.trim();
    if (!filePath) {
      return NextResponse.json(
        { error: "Document has no file_path; cannot load PDF from storage." },
        { status: 400 }
      );
    }
    const buffer = await getPdfBufferFromStorage(filePath);
    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "PDF file not found in storage or empty. Path: " + filePath },
        { status: 400 }
      );
    }
    const rawText = await extractTextFromPdfBuffer(buffer);
    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        {
          error:
            "Ingen text kunde extraheras från PDF:en. Troligen en skannad PDF (bilder utan textlager). OCR stöds inte – använd en PDF med valbar text eller klistra in text manuellt.",
        },
        { status: 400 }
      );
    }
    await updateMenuDocument(id, { raw_text: rawText });
    const updated = await getMenuDocumentById(id);
    return NextResponse.json({
      ok: true,
      document: updated,
      raw_text_length: rawText.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message === "Admin authentication required" ? 401 : 500;
    return NextResponse.json(
      { error: message },
      { status: status === 401 ? 401 : 500 }
    );
  }
}
