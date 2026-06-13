/** City/region from Starwinelist venue page embedded `location` object. */
export interface SwlLocation {
  slug: string | null;
  name: string | null;
}

/**
 * Parse `location: {"slug":"stockholm","name":"Stockholm",...}` from rendered HTML.
 * Works with both escaped JSON (unblock) and plain JSON fragments.
 */
export function parseSwlLocationFromHtml(html: string): SwlLocation | null {
  const m = html.match(/location:\s*(\{[^}]+\})/);
  if (!m) return null;

  const raw = m[1];
  const slug =
    raw.match(/"slug":"([^"]*)"/)?.[1] ??
    raw.match(/\\"slug\\":\\"([^\\"]*)\\"/)?.[1] ??
    null;
  const name =
    raw.match(/"name":"([^"]*)"/)?.[1] ??
    raw.match(/\\"name\\":\\"([^\\"]*)\\"/)?.[1] ??
    null;

  const normalizedSlug =
    slug == null || slug === "" || slug === "null" ? null : slug.toLowerCase().trim();
  const normalizedName = name == null || name === "" ? null : name.trim();

  if (!normalizedSlug && !normalizedName) return null;
  return { slug: normalizedSlug, name: normalizedName };
}

export function normalizeSwlCitySlug(
  slug: string | null | undefined,
): string | null {
  if (slug == null || slug === "" || slug === "null") return null;
  return slug.toLowerCase().trim();
}

/** True when SWL reports a city slug that differs from the crawl scope (e.g. stockholm). */
export function isWrongCityForScope(
  location: SwlLocation | null | undefined,
  expectedCity: string,
): boolean {
  const actual = normalizeSwlCitySlug(location?.slug ?? null);
  if (!actual) return false;
  return actual !== expectedCity.toLowerCase().trim();
}
