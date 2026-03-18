/**
 * Validation for menu extraction – confidence, review reasons, validation flags.
 * All logic here; not in UI.
 */

import type {
  AIExtractedRow,
  ReviewReason,
  ConfidenceLabel,
} from "./types";
import { KNOWN_COUNTRIES_NORMALIZED } from "./normalization";

export function getReviewReasons(row: AIExtractedRow): ReviewReason[] {
  const reasons: ReviewReason[] = [];

  if (
    row.row_type === "wine_row" &&
    row.price_glass == null &&
    row.price_bottle == null &&
    row.price_other == null
  ) {
    reasons.push("missing_price");
  }
  if (row.row_type === "wine_row" && !row.wine_name?.trim()) {
    reasons.push("missing_wine_name");
  }
  if (row.row_type === "wine_row" && !row.producer?.trim()) {
    reasons.push("missing_producer");
  }
  if (row.country?.trim()) {
    const normalized = row.country.trim();
    const isKnown =
      KNOWN_COUNTRIES_NORMALIZED.has(normalized) ||
      KNOWN_COUNTRIES_NORMALIZED.has(normalized.toLowerCase());
    if (!isKnown) {
      reasons.push("unknown_country");
    }
  }
  if (row.review_reasons?.includes("grapes_inferred")) {
    reasons.push("grapes_inferred");
  }
  // Don't flag N.V. (non-vintage) as suspicious
  const vintageIsNV =
    row.vintage?.trim().toUpperCase() === "N.V." ||
    /^n\.?\s*v\.?$/i.test(row.vintage?.trim() ?? "");
  if (
    row.review_reasons?.includes("suspicious_vintage") &&
    !vintageIsNV
  ) {
    reasons.push("suspicious_vintage");
  }
  if (row.review_reasons?.includes("multiple_price_formats")) {
    reasons.push("multiple_price_formats");
  }
  const confidence = computeConfidence(row);
  if (confidence < 0.6) {
    reasons.push("low_confidence");
  }
  if (row.review_reasons?.includes("likely_non_wine_row")) {
    reasons.push("likely_non_wine_row");
  }
  if (row.review_reasons?.includes("ambiguous_format")) {
    reasons.push("ambiguous_format");
  }
  if (row.review_reasons?.includes("region_country_mismatch")) {
    reasons.push("region_country_mismatch");
  }

  return [...new Set(reasons)];
}

/**
 * Computes 0.0–1.0 from completeness + AI confidence.
 * Central fields (producer, wine_name, price) and AI confidence contribute.
 */
export function computeConfidence(row: AIExtractedRow): number {
  const aiConf = Math.max(0, Math.min(1, row.confidence ?? 0));
  if (row.row_type !== "wine_row") {
    return Math.min(aiConf, 0.5);
  }
  let completeness = 0;
  if (row.producer?.trim()) completeness += 0.25;
  if (row.wine_name?.trim()) completeness += 0.25;
  const hasPrice =
    row.price_glass != null ||
    row.price_bottle != null ||
    row.price_other != null;
  if (hasPrice) completeness += 0.25;
  if (row.country?.trim() || row.region?.trim()) completeness += 0.125;
  if (row.vintage?.trim()) completeness += 0.125;
  const combined = aiConf * 0.6 + completeness * 0.4;
  return Math.round(combined * 100) / 100;
}

/**
 * Maps numeric confidence to label.
 * high ≥ 0.85 | medium 0.60–0.84 | low < 0.60
 */
export function computeConfidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence >= 0.85) return "high";
  if (confidence >= 0.6) return "medium";
  return "low";
}

export function validateExtractedRow(row: AIExtractedRow): {
  isValid: boolean;
  flags: Record<string, string>;
} {
  const flags: Record<string, string> = {};
  const reasons = getReviewReasons(row);
  if (reasons.length > 0) {
    flags.review_reasons = reasons.join(",");
  }
  const confidence = computeConfidence(row);
  if (confidence < 0.6) {
    flags.low_confidence = String(confidence);
  }
  if (row.row_type === "wine_row") {
    if (!row.wine_name?.trim()) flags.missing_wine_name = "1";
    if (!row.producer?.trim()) flags.missing_producer = "1";
    const hasPrice =
      row.price_glass != null ||
      row.price_bottle != null ||
      row.price_other != null;
    if (!hasPrice) flags.missing_price = "1";
  }
  const isValid = reasons.length === 0 && confidence >= 0.6;
  return { isValid, flags };
}

/** Reasons that alone don't require review when confidence is at least medium. */
const SOFT_REVIEW_REASONS = new Set<ReviewReason>([
  "grapes_inferred",
  "ambiguous_format",
]);

/**
 * A row needs review if:
 * confidence_label !== 'high' OR review_reasons.length > 0 OR central fields missing.
 * Exception: if confidence is at least "medium" and the only reasons are soft
 * (grapes_inferred, ambiguous_format), we do not require review.
 */
export function needsReview(
  row: AIExtractedRow,
  confidenceLabel: ConfidenceLabel
): boolean {
  if (confidenceLabel === "low") return true;
  const reasons = getReviewReasons(row);
  const hardReasons = reasons.filter((r) => !SOFT_REVIEW_REASONS.has(r));
  if (hardReasons.length > 0) return true;
  if (reasons.length > 0) {
    // Only soft reasons left; require at least medium confidence to skip review
    if (confidenceLabel !== "medium" && confidenceLabel !== "high") return true;
    return false;
  }
  if (row.row_type === "wine_row") {
    if (!row.wine_name?.trim()) return true;
    if (!row.producer?.trim()) return true;
    const hasPrice =
      row.price_glass != null ||
      row.price_bottle != null ||
      row.price_other != null;
    if (!hasPrice) return true;
  }
  return false;
}
