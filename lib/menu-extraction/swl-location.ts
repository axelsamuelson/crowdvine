/** City/region from Starwinelist venue page embedded `location` object. */
export interface SwlLocation {
  slug: string | null;
  name: string | null;
}

/** Turn display names like "Las Vegas" into SWL slugs like "las-vegas". */
export function cityNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "-");
}

export function normalizeSwlCitySlug(
  slug: string | null | undefined,
): string | null {
  if (slug == null || slug === "" || slug === "null") return null;
  return slug.toLowerCase().trim();
}

function parseLocationJson(html: string): SwlLocation | null {
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

  const normalizedSlug = normalizeSwlCitySlug(slug);
  const normalizedName = name == null || name === "" ? null : name.trim();

  if (!normalizedSlug && !normalizedName) return null;
  return { slug: normalizedSlug, name: normalizedName };
}

/** Fallback when embedded `location` JSON is missing (partial HTML, markdown export). */
function parseLocationFromPageText(html: string): SwlLocation | null {
  const updatesMatch = html.match(
    /latest updated wine lists in ([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]+?)(?:\s*\n|<|$|\d{4})/i,
  );
  if (updatesMatch) {
    const name = updatesMatch[1].trim();
    return { slug: cityNameToSlug(name), name };
  }

  const guideMatch = html.match(
    /wine-guide\/[^"'\s]*-in-([a-z0-9-]+?)(?:-\d{4})?(?:["'\s/]|$)/i,
  );
  if (guideMatch) {
    const slug = normalizeSwlCitySlug(guideMatch[1]);
    if (slug) {
      const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { slug, name };
    }
  }

  const countryMatch = html.match(
    /List of the Year ([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s'-]+?) 20\d{2}/i,
  );
  if (countryMatch) {
    const name = countryMatch[1].trim();
    return { slug: cityNameToSlug(name), name };
  }

  return null;
}

/**
 * Parse venue city/region from Starwinelist HTML.
 * Primary: embedded `location` JSON. Fallback: wine-guide links and "lists in {City}" copy.
 */
export function parseSwlLocationFromHtml(html: string): SwlLocation | null {
  return parseLocationJson(html) ?? parseLocationFromPageText(html);
}

/** True when SWL reports a city/region that differs from the crawl scope (e.g. stockholm). */
export function isWrongCityForScope(
  location: SwlLocation | null | undefined,
  expectedCity: string,
): boolean {
  if (!location) return false;
  const expected = expectedCity.toLowerCase().trim();

  const slug = normalizeSwlCitySlug(location.slug);
  if (slug) return slug !== expected;

  const name = location.name?.toLowerCase().trim();
  if (!name) return false;
  if (name === expected) return false;
  // "Stockholm" substring in region name is OK; everything else is out of scope.
  return !name.includes(expected);
}
