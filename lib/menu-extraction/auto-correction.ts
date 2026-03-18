/**
 * Auto-correction: second pass on rows with needs_review using few-shot from feedback.
 * Best-effort – never throws out of runAutoCorrection; extraction continues if this fails.
 */

import {
  getExtractedRowsByDocumentId,
  getDocumentSectionsByDocumentId,
  getExtractionFeedbackBySlug,
  updateExtractedRow,
} from "./db";
import { buildFewShotBlock } from "./few-shot";
import { buildExtractionPromptWithFewShot } from "./prompts";
import { extractSectionWithSystemPrompt, mapAIResultToRows } from "./service";
import type { MenuExtractedRow } from "./types";

export type AutoCorrectionResult = {
  rowsAttempted: number;
  rowsImproved: number;
  rowsStillNeedsReview: number;
};

/**
 * Run auto-correction on a document: re-extract sections that have needs_review rows
 * using few-shot from feedback for this slug. Updates rows that improve (needs_review → false).
 */
export async function runAutoCorrection(params: {
  documentId: string;
  slug: string;
  rawText: string;
}): Promise<AutoCorrectionResult> {
  const { documentId, slug, rawText } = params;
  const result: AutoCorrectionResult = {
    rowsAttempted: 0,
    rowsImproved: 0,
    rowsStillNeedsReview: 0,
  };

  const allRows = await getExtractedRowsByDocumentId(documentId);
  const needsReviewRows = allRows.filter((r) => r.needs_review === true);
  if (needsReviewRows.length === 0) {
    return result;
  }

  const feedback = await getExtractionFeedbackBySlug(slug);
  if (!feedback.length) {
    console.warn("[auto-correction] No feedback for slug:", slug, "– skipping re-extraction");
    return result;
  }

  const fewShotBlock = buildFewShotBlock(feedback);
  const systemPrompt = buildExtractionPromptWithFewShot(fewShotBlock);
  const sections = await getDocumentSectionsByDocumentId(documentId);
  const sectionMap: Record<string, string> = {};
  for (const s of sections) {
    sectionMap[s.section_name] = s.id;
  }

  const bySection = new Map<string | null, MenuExtractedRow[]>();
  for (const row of needsReviewRows) {
    const sid = row.section_id ?? "uncategorized";
    if (!bySection.has(sid)) bySection.set(sid, []);
    bySection.get(sid)!.push(row);
  }

  for (const [sectionId, rowsInSection] of bySection) {
    if (rowsInSection.length === 0) continue;
    if (sectionId === "uncategorized" || !sectionId) {
      result.rowsStillNeedsReview += rowsInSection.length;
      continue;
    }
    const section = sections.find((s) => s.id === sectionId);
    const sectionName = section?.section_name ?? "";
    if (!sectionName) continue;
    const sectionIndex = section ? sections.findIndex((s) => s.id === section.id) : 0;
    const nextSection = sections[sectionIndex + 1];
    const nextSectionName = nextSection?.section_name;

    try {
      const { result: extractionResult } = await extractSectionWithSystemPrompt(
        rawText,
        sectionName,
        nextSectionName,
        systemPrompt
      );
      if (!extractionResult.sections.length) continue;

      const normalizedRows = mapAIResultToRows(documentId, extractionResult, sectionMap);
      for (const dbRow of rowsInSection) {
        result.rowsAttempted += 1;
        const rawTrim = dbRow.raw_text?.trim() ?? "";
        const match = normalizedRows.find(
          (nr) => (nr.raw_text?.trim() ?? "") === rawTrim
        );
        if (!match) {
          result.rowsStillNeedsReview += 1;
          continue;
        }
        if (match.needs_review) {
          result.rowsStillNeedsReview += 1;
          continue;
        }
        await updateExtractedRow(dbRow.id, {
          producer: match.producer,
          wine_name: match.wine_name,
          vintage: match.vintage,
          region: match.region,
          country: match.country,
          price_glass: match.price_glass,
          price_bottle: match.price_bottle,
          price_other: match.price_other,
          needs_review: false,
          review_reasons: null,
        });
        result.rowsImproved += 1;
        console.warn(
          "[auto-correction] Improved row",
          dbRow.id,
          ": review_reasons → cleared"
        );
      }
    } catch (err) {
      console.warn("[auto-correction] Section failed:", sectionName, err);
    }
  }

  result.rowsStillNeedsReview = needsReviewRows.length - result.rowsImproved;

  console.warn(
    "[auto-correction] Document",
    documentId,
    ":",
    result.rowsAttempted,
    "attempted,",
    result.rowsImproved,
    "improved,",
    result.rowsStillNeedsReview,
    "still needs review"
  );
  return result;
}
