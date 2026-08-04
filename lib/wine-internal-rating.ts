import { z } from "zod";

export interface WineInternalRating {
  id: string;
  wine_id: string;
  rater_id: string;
  score: number | null;
  verdict: "buy" | "maybe" | "pass" | null;
  notes: string | null;
  tasted_at: string;
  created_at: string;
  rater_email?: string | null;
}

const verdictEnum = z.enum(["buy", "maybe", "pass"]);

/** Zod input schema for creating an internal rating (not a server action). */
export const createWineInternalRatingSchema = z
  .object({
    wine_id: z.string().uuid(),
    score: z.number().int().min(1).max(100).optional().nullable(),
    verdict: verdictEnum.optional().nullable(),
    notes: z.string().optional().nullable(),
    tasted_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "tasted_at must be an ISO date (YYYY-MM-DD)"),
  })
  .refine((data) => data.score != null || data.verdict != null, {
    message: "Ange minst poäng eller omdöme",
    path: ["score"],
  });

export type CreateWineInternalRatingInput = z.infer<
  typeof createWineInternalRatingSchema
>;
