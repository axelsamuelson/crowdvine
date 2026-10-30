import type { SupabaseClient } from "@supabase/supabase-js";
import { exitDiscountRetentionMonths } from "@/lib/exit-discount/config";

export type ExitDiscountRetentionSummary = {
  retentionMonths: number;
  cutoffIso: string;
  deletedLeads: number;
  deactivatedPromos: number;
};

/**
 * Delete unused exit discount leads older than retention window,
 * and deactivate their promo codes. Does not touch newsletter_consents.
 */
export async function runExitDiscountRetention(
  sb: SupabaseClient,
  now: Date = new Date(),
): Promise<ExitDiscountRetentionSummary> {
  const months = exitDiscountRetentionMonths();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffIso = cutoff.toISOString();

  const { data: stale, error } = await sb
    .from("exit_discount_codes")
    .select("id, promo_discount_code_id")
    .is("redeemed_at", null)
    .lt("created_at", cutoffIso);

  if (error) {
    throw new Error(`exit discount retention lookup failed: ${error.message}`);
  }

  const rows = stale ?? [];
  const promoIds = rows
    .map((r) => r.promo_discount_code_id as string | null)
    .filter((id): id is string => !!id);
  const leadIds = rows.map((r) => r.id as string);

  let deactivatedPromos = 0;
  if (promoIds.length > 0) {
    const { error: promoErr, count } = await sb
      .from("promo_discount_codes")
      .update({ active: false }, { count: "exact" })
      .in("id", promoIds);
    if (promoErr) {
      throw new Error(
        `exit discount retention promo update failed: ${promoErr.message}`,
      );
    }
    deactivatedPromos = count ?? promoIds.length;
  }

  let deletedLeads = 0;
  if (leadIds.length > 0) {
    const { error: delErr, count } = await sb
      .from("exit_discount_codes")
      .delete({ count: "exact" })
      .in("id", leadIds);
    if (delErr) {
      throw new Error(
        `exit discount retention delete failed: ${delErr.message}`,
      );
    }
    deletedLeads = count ?? leadIds.length;
  }

  return {
    retentionMonths: months,
    cutoffIso,
    deletedLeads,
    deactivatedPromos,
  };
}
