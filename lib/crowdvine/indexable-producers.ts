import { PRODUCER_DB_SELECT } from "@/lib/catalog-mappers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Columns that may be absent on older / TEST schemas. */
const OPTIONAL_PRODUCER_COLUMNS = [
  "lat",
  "lon",
  "website_url",
  "instagram_handle",
  "certification_verified_url",
  "certification_in_conversion",
  "certification_lapsed",
] as const;

function missingColumnFromError(errorMessage: string): string | null {
  const patterns = [
    /column\s+[a-z_]+\.([a-z_0-9]+)\s+does not exist/i,
    /could not find\s+(?:the\s+)?column\s+['"]?([a-z_0-9]+)['"]?/i,
    /Could not find the '([a-z_0-9]+)' column/i,
  ];
  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return null;
}

function stripMissingOptionalColumns(
  select: string,
  errorMessage: string,
): string | null {
  const parts = select.split(",").map((part) => part.trim()).filter(Boolean);
  const named = missingColumnFromError(errorMessage);

  if (
    named &&
    OPTIONAL_PRODUCER_COLUMNS.includes(
      named as (typeof OPTIONAL_PRODUCER_COLUMNS)[number],
    )
  ) {
    const filtered = parts.filter((part) => part !== named);
    if (filtered.length < parts.length) return filtered.join(", ");
  }

  if (
    !/column.*does not exist|could not find.*column/i.test(errorMessage) &&
    !OPTIONAL_PRODUCER_COLUMNS.some((column) => errorMessage.includes(column))
  ) {
    return null;
  }

  const filtered = parts.filter((part) => {
    return !OPTIONAL_PRODUCER_COLUMNS.some(
      (column) =>
        part === column &&
        (errorMessage.includes(column) ||
          /column.*does not exist|could not find.*column/i.test(errorMessage)),
    );
  });

  if (filtered.length === parts.length) {
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
