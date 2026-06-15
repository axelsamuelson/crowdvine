import { PRODUCER_DB_SELECT } from "@/lib/catalog-mappers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Active, live producers — aligned with sitemap and public producer pages. */
export async function fetchIndexableProducersFromDb<
  Select extends string = typeof PRODUCER_DB_SELECT,
>(select: Select = PRODUCER_DB_SELECT as Select) {
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("producers")
    .select(select)
    .eq("is_live", true)
    .eq("status", "active")
    .order("name");

  if (error && /is_live|status/i.test(error.message)) {
    const fallback = await sb
      .from("producers")
      .select(select)
      .eq("status", "active")
      .order("name");
    if (fallback.error) return [];
    return fallback.data ?? [];
  }

  if (error) return [];
  return data ?? [];
}
