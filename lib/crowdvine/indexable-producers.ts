import { PRODUCER_DB_SELECT } from "@/lib/catalog-mappers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const OPTIONAL_PRODUCER_COLUMNS = [
  "certification_verified_url",
  "certification_in_conversion",
] as const;

function stripMissingOptionalColumns(
  select: string,
  errorMessage: string,
): string | null {
  if (
    !/column.*does not exist|could not find.*column|certification_verified_url|certification_in_conversion/i.test(
      errorMessage,
    )
  ) {
    return null;
  }

  const parts = select.split(",").map((part) => part.trim());
  const filtered = parts.filter((part) => {
    return !OPTIONAL_PRODUCER_COLUMNS.some(
      (column) =>
        part === column &&
        (errorMessage.includes(column) ||
          /column.*does not exist|could not find.*column/i.test(errorMessage)),
    );
  });

  if (filtered.length === parts.length) {
    // Unknown optional column named in a generic missing-column error — drop both.
    const withoutOptional = parts.filter(
      (part) =>
        !OPTIONAL_PRODUCER_COLUMNS.includes(
          part as (typeof OPTIONAL_PRODUCER_COLUMNS)[number],
        ),
    );
    if (withoutOptional.length === parts.length) return null;
    return withoutOptional.join(", ");
  }

  return filtered.join(", ");
}

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
    if (fallback.error) {
      const stripped = stripMissingOptionalColumns(
        select,
        fallback.error.message,
      );
      if (stripped) {
        return fetchIndexableProducersFromDb(stripped as Select);
      }
      return [];
    }
    return fallback.data ?? [];
  }

  if (error) {
    const stripped = stripMissingOptionalColumns(select, error.message);
    if (stripped) {
      return fetchIndexableProducersFromDb(stripped as Select);
    }
    return [];
  }
  return data ?? [];
}
