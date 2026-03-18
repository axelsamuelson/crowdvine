/**
 * Zod schemas for validating AI extraction response.
 * Used in callMenuExtractionModel before passing result to mapAIResultToRows/save.
 * Hardened with .catch() / .default() so that minor AI output quirks don't produce empty sections.
 */

import { z } from "zod";

/** Tolerant: accept known row_type or any string (e.g. subheader, subsection_header, country_header). */
const rowTypeEnum = z.union([
  z.enum(["wine_row", "header", "description", "noise", "unknown"]),
  z.string(),
]);

/** Tolerant: accept known wine_type or any string (e.g. house_wine). */
const wineTypeEnum = z.union([
  z.enum([
    "sparkling",
    "white",
    "orange",
    "rose",
    "red",
    "sweet",
    "fortified",
    "non_alcoholic",
    "unknown",
  ]),
  z.string(),
]);

const reviewReasonEnum = z.union([
  z.enum([
    "missing_price",
    "missing_wine_name",
    "missing_producer",
    "unknown_country",
    "grapes_inferred",
    "suspicious_vintage",
    "multiple_price_formats",
    "low_confidence",
    "likely_non_wine_row",
    "ambiguous_format",
    "region_country_mismatch",
    "missing_region",
  ]),
  z.string(),
]);

/** Coerce confidence from number or string; clamp to [0,1]; default 0.5 on invalid. */
const confidenceSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "number" ? v : parseFloat(String(v))))
  .pipe(z.number().min(0).max(1))
  .catch(0.5);

const aiExtractedRowSchema = z
  .object({
    raw_text: z.union([z.string(), z.null(), z.undefined()]).transform((s) => (s != null ? String(s) : "")).catch(""),
    row_type: rowTypeEnum.catch("unknown"),
    wine_type: wineTypeEnum.nullable().catch(null),
    producer: z.string().nullable().catch(null),
    wine_name: z.string().nullable().catch(null),
    vintage: z.string().nullable().catch(null),
    region: z.string().nullable().catch(null),
    country: z.string().nullable().catch(null),
    grapes: z.array(z.string()).catch([]),
    attributes: z.array(z.string()).catch([]),
    format_label: z.string().nullable().catch(null),
    price_glass: z.number().nullable().catch(null),
    price_bottle: z.number().nullable().catch(null),
    price_other: z.number().nullable().catch(null),
    currency: z.string().nullable().catch(null),
    confidence: confidenceSchema,
    review_reasons: z.array(reviewReasonEnum).catch([]),
  })
  .passthrough();

const aiSectionBlockSchema = z.object({
  section_name: z.string().catch(""),
  normalized_section: z.string().catch(""),
  rows: z.array(aiExtractedRowSchema).catch([]),
});

export const aiExtractionResultSchema = z.object({
  sections: z.array(aiSectionBlockSchema).min(0).catch([]),
});

export type AIExtractionResultValidated = z.infer<typeof aiExtractionResultSchema>;
