/**
 * Step-based orchestrator for manual menu pipeline (Golden Path).
 * Reuses: starwinelist-scraper, pdf-extractor, storage, db, service.
 * Logs each step to menu_manual_runs.steps and keeps run status updated.
 */

import {
  createMenuDocument,
  getLatestDocumentForSlug,
  getMenuManualRunById,
  getStarwinelistSourceBySlug,
  updateStarwinelistSource,
  updateMenuManualRun,
  upsertStarwinelistSource,
} from "./db";
import { extractMenuFromDocument } from "./service";
import { extractTextFromPdfBuffer } from "./pdf-extractor";
import { uploadPdfToStorage } from "./storage";
import { sha256Hex } from "./checksum";
import { fetchRestaurantPage, downloadPdf } from "./starwinelist-scraper";
import type { ManualRunStep } from "./types";

const STARWINELIST_BASE = "https://starwinelist.com";

export interface RunManualMenuPipelineParams {
  slug: string;
  city?: string;
  dryRun?: boolean;
  runId: string;
}

export interface RunManualMenuPipelineResult {
  status: "completed" | "failed" | "unchanged";
  documentId: string | null;
  errorMessage: string | null;
}

function now(): string {
  return new Date().toISOString();
}

async function appendStep(
  runId: string,
  step: ManualRunStep
): Promise<void> {
  const run = await getMenuManualRunById(runId);
  if (!run) return;
  const steps = Array.isArray(run.steps) ? [...run.steps, step] : [step];
  await updateMenuManualRun(runId, { steps });
}

export async function runManualMenuPipeline(
  params: RunManualMenuPipelineParams
): Promise<RunManualMenuPipelineResult> {
  const { slug, city = "stockholm", dryRun = false, runId } = params;

  await updateMenuManualRun(runId, {
    status: "running",
    started_at: now(),
  });

  let pdfBuffer: Buffer | null = null;
  let contentHash: string | null = null;
  let documentId: string | null = null;
  let source = await getStarwinelistSourceBySlug(slug);
  if (!source) {
    source = await upsertStarwinelistSource({
      slug,
      source_url: `${STARWINELIST_BASE}/wine-place/${slug}`,
      city,
    });
  }

  try {
    // Step 1: resolve PDF URL
    const step1Start = now();
    const page = await fetchRestaurantPage(slug);
    await appendStep(runId, {
      name: "resolve_pdf_url",
      started_at: step1Start,
      finished_at: now(),
      ok: !!page?.pdf_url,
      summary: page ? { pdf_url: page.pdf_url, name: page.name } : undefined,
      error: page?.pdf_url ? undefined : "Could not fetch restaurant page or no PDF link",
    });
    if (!page?.pdf_url) {
      await updateMenuManualRun(runId, {
        status: "failed",
        error_message: "No PDF URL on restaurant page",
        finished_at: now(),
      });
      return { status: "failed", documentId: null, errorMessage: "No PDF URL on restaurant page" };
    }

    // Step 2: download PDF
    const step2Start = now();
    const restaurantUrl = `${STARWINELIST_BASE}/wine-place/${slug}`;
    pdfBuffer = await downloadPdf(restaurantUrl, page.pdf_url);
    await appendStep(runId, {
      name: "download_pdf",
      started_at: step2Start,
      finished_at: now(),
      ok: !!(pdfBuffer && pdfBuffer.length > 0),
      summary: pdfBuffer ? { bytes: pdfBuffer.length } : undefined,
      error: pdfBuffer?.length ? undefined : "PDF download failed",
    });
    if (!pdfBuffer || pdfBuffer.length === 0) {
      await updateMenuManualRun(runId, {
        status: "failed",
        error_message: "PDF download failed",
        finished_at: now(),
      });
      return { status: "failed", documentId: null, errorMessage: "PDF download failed" };
    }

    // Step 3: compute checksum
    const step3Start = now();
    contentHash = sha256Hex(pdfBuffer);
    await appendStep(runId, {
      name: "compute_checksum",
      started_at: step3Start,
      finished_at: now(),
      ok: true,
      summary: { content_hash: contentHash, bytes: pdfBuffer.length },
    });

    // Step 4: idempotency check
    const step4Start = now();
    const latestDoc = await getLatestDocumentForSlug(slug);
    const unchanged =
      latestDoc?.content_hash != null &&
      latestDoc.content_hash === contentHash &&
      latestDoc.extraction_status === "completed";
    await appendStep(runId, {
      name: "idempotency_check",
      started_at: step4Start,
      finished_at: now(),
      ok: true,
      summary: {
        latest_document_id: latestDoc?.id ?? null,
        same_hash: latestDoc?.content_hash === contentHash,
        extraction_completed: latestDoc?.extraction_status === "completed",
        unchanged,
      },
    });
    if (unchanged && latestDoc) {
      await updateMenuManualRun(runId, {
        status: "unchanged",
        document_id: latestDoc.id,
        content_hash: contentHash,
        finished_at: now(),
        error_message: null,
      });
      return {
        status: "unchanged",
        documentId: latestDoc.id,
        errorMessage: null,
      };
    }

    // Step 5: upload to storage
    const step5Start = now();
    const timestamp = new Date().toISOString();
    const storagePath = await uploadPdfToStorage(slug, pdfBuffer, timestamp);
    const fileName = storagePath.split("/").pop() ?? "menu.pdf";
    await appendStep(runId, {
      name: "upload_storage",
      started_at: step5Start,
      finished_at: now(),
      ok: true,
      summary: { file_path: storagePath, file_name: fileName },
    });

    // Step 6: extract raw text
    const step6Start = now();
    const rawText = await extractTextFromPdfBuffer(pdfBuffer);
    await appendStep(runId, {
      name: "extract_raw_text",
      started_at: step6Start,
      finished_at: now(),
      ok: true,
      summary: { raw_text_length: rawText?.length ?? 0, has_text: !!(rawText && rawText.trim().length > 0) },
    });

    // Step 7: create menu_document
    const step7Start = now();
    const doc = await createMenuDocument({
      file_path: storagePath,
      file_name: fileName,
      mime_type: "application/pdf",
      source_type: "starwinelist",
      raw_text: rawText,
      content_hash: contentHash,
      source_slug: slug,
    });
    documentId = doc.id;
    await appendStep(runId, {
      name: "create_menu_document",
      started_at: step7Start,
      finished_at: now(),
      ok: true,
      summary: { document_id: doc.id },
    });

    if (dryRun) {
      await updateMenuManualRun(runId, {
        status: "completed",
        document_id: doc.id,
        content_hash: contentHash,
        finished_at: now(),
        error_message: null,
      });
      return { status: "completed", documentId: doc.id, errorMessage: null };
    }

    // Step 8/9: AI extraction
    const step8Start = now();
    let extractionOk = false;
    let extractionError: string | null = null;
    if ((rawText ?? "").trim().length > 0) {
      try {
        await extractMenuFromDocument(doc.id);
        extractionOk = true;
      } catch (err) {
        extractionError = err instanceof Error ? err.message : String(err);
      }
    }
    await appendStep(runId, {
      name: "ai_extraction",
      started_at: step8Start,
      finished_at: now(),
      ok: extractionOk,
      summary: { document_id: doc.id },
      error: extractionError ?? undefined,
    });
    if (extractionError && (rawText ?? "").trim().length > 0) {
      await updateMenuManualRun(runId, {
        status: "failed",
        document_id: doc.id,
        content_hash: contentHash,
        error_message: extractionError,
        finished_at: now(),
      });
      return { status: "failed", documentId: doc.id, errorMessage: extractionError };
    }

    // Step 10: update starwinelist_sources.latest_document_id
    await updateStarwinelistSource(source.id, {
      crawl_status: "completed",
      last_crawled_at: now(),
      last_error: null,
      name: page.name,
      pdf_url: page.pdf_url,
      pdf_last_seen_at: timestamp,
      swl_updated_at: page.swl_updated_at,
      latest_document_id: doc.id,
    });

    await updateMenuManualRun(runId, {
      status: "completed",
      document_id: doc.id,
      content_hash: contentHash,
      finished_at: now(),
      error_message: null,
    });
    return { status: "completed", documentId: doc.id, errorMessage: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateMenuManualRun(runId, {
      status: "failed",
      document_id: documentId,
      content_hash: contentHash ?? undefined,
      error_message: message,
      finished_at: now(),
    });
    return {
      status: "failed",
      documentId,
      errorMessage: message,
    };
  }
}
