"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createWineInternalRatingSchema,
  type CreateWineInternalRatingInput,
  type WineInternalRating,
} from "@/lib/wine-internal-rating";

async function attachRaterEmails(
  rows: Omit<WineInternalRating, "rater_email">[],
): Promise<WineInternalRating[]> {
  if (rows.length === 0) return [];

  const raterIds = [...new Set(rows.map((r) => r.rater_id))];
  const sb = getSupabaseAdmin();
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email")
    .in("id", raterIds);

  const emailById = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.email as string) ?? null]),
  );

  return rows.map((row) => ({
    ...row,
    rater_email: emailById.get(row.rater_id) ?? null,
  }));
}

/**
 * Admin cookie auth does not establish a Supabase JWT session, so auth.uid()
 * is often null and RLS would block. Gate with getCurrentAdmin(), then use
 * the service-role client (same pattern as updateWine).
 */
export async function getWineInternalRatings(
  wineId: string,
): Promise<WineInternalRating[]> {
  const admin = await getCurrentAdmin();
  if (!admin) return [];

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wine_internal_ratings")
    .select(
      "id, wine_id, rater_id, score, verdict, notes, tasted_at, created_at",
    )
    .eq("wine_id", wineId)
    .order("tasted_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return attachRaterEmails(
    (data ?? []) as Omit<WineInternalRating, "rater_email">[],
  );
}

export async function createWineInternalRating(
  input: CreateWineInternalRatingInput,
): Promise<WineInternalRating> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new Error("Admin authentication required");
  }

  let parsed: CreateWineInternalRatingInput;
  try {
    parsed = createWineInternalRatingSchema.parse(input);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new Error(err.errors[0]?.message ?? "Ogiltig indata");
    }
    throw err;
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wine_internal_ratings")
    .insert({
      wine_id: parsed.wine_id,
      rater_id: admin.id,
      score: parsed.score ?? null,
      verdict: parsed.verdict ?? null,
      notes: parsed.notes?.trim() ? parsed.notes.trim() : null,
      tasted_at: parsed.tasted_at,
    })
    .select(
      "id, wine_id, rater_id, score, verdict, notes, tasted_at, created_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Failed to create rating");
  }

  revalidatePath(`/admin/wines/${parsed.wine_id}`);

  const [withEmail] = await attachRaterEmails([
    data as Omit<WineInternalRating, "rater_email">,
  ]);
  return withEmail;
}
