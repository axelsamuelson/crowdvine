/**
 * Zod schemas for validating AI extraction response.
 * Used in callMenuExtractionModel before passing result to mapAIResultToRows/save.
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

const aiExtractedRowSchema = z.object({
  raw_text: z.string(),
  row_type: rowTypeEnum,
  wine_type: wineTypeEnum.nullable(),
  producer: z.string().nullable(),
  wine_name: z.string().nullable(),
  vintage: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  grapes: z.array(z.string()),
  attributes: z.array(z.string()),
  format_label: z.string().nullable(),
  price_glass: z.number().nullable(),
  price_bottle: z.number().nullable(),
  price_other: z.number().nullable(),
  currency: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  review_reasons: z.array(reviewReasonEnum),
});

const aiSectionBlockSchema = z.object({
  section_name: z.string(),
  normalized_section: z.string(),
  rows: z.array(aiExtractedRowSchema),
});

export const aiExtractionResultSchema = z.object({
  sections: z.array(aiSectionBlockSchema).min(0),
});

export type AIExtractionResultValidated = z.infer<typeof aiExtractionResultSchema>;
