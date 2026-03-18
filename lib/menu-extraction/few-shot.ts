/**
 * Few-shot block builder from menu_extraction_feedback.
 * Used by auto-correction to inject prior corrections into the extraction prompt.
 */

import type { MenuExtractionFeedback, MenuExtractedRow } from "./types";

const MAX_FEW_SHOT_EXAMPLES = 5;

function getStr(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return v == null ? "" : String(v);
}

/**
 * Builds a few-shot block string from feedback for inclusion in the system prompt.
 * Takes at most 5 feedback items and formats each as: raw text, wrong extraction, correct extraction.
 */
export function buildFewShotBlock(feedback: MenuExtractionFeedback[]): string {
  if (!feedback.length) return "";
  const selected = feedback.slice(0, MAX_FEW_SHOT_EXAMPLES);
  const lines: string[] = [];
  for (const post of selected) {
    const orig = post.original_prediction ?? {};
    const corr = post.corrected_payload ?? {};
    const rawText = getStr(orig, "raw_text") || getStr(corr, "raw_text") || "(okänd rad)";
    lines.push(
      "Råtext: " + rawText + "\n" +
      "Felaktig extraction:\n  producer: " + getStr(orig, "producer") + ", wine_name: " + getStr(orig, "wine_name") + ", vintage: " + getStr(orig, "vintage") + "\n" +
      "Korrekt extraction:\n  producer: " + getStr(corr, "producer") + ", wine_name: " + getStr(corr, "wine_name") + ", vintage: " + getStr(corr, "vintage")
    );
  }
  return lines.join("\n\n");
}

/**
 * Selects feedback posts most relevant to a row (e.g. similar review_reasons).
 * For now returns the first N from the list (caller should pass feedback sorted by relevance or date).
 */
export function selectRelevantFeedback(
  feedback: MenuExtractionFeedback[],
  _row: MenuExtractedRow
): MenuExtractionFeedback[] {
  // TODO(menu-extraction): prefer feedback with overlapping review_reasons or similar raw_text length
  return feedback.slice(0, MAX_FEW_SHOT_EXAMPLES);
}
