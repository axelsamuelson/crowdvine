export type GeoZoneMatchRow = {
  id: string;
  city?: string | null;
  name?: string | null;
  display_name?: string | null;
  country_code?: string | null;
  region_code?: string | null;
};

export type DetectedLocation = {
  country: string | null;
  city: string | null;
  region: string | null;
};

function normalizeGeoToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function normCountry(code: string | null | undefined): string | null {
  const c = code?.trim();
  return c ? c.toUpperCase() : null;
}

function zoneCityTokens(zone: GeoZoneMatchRow): string[] {
  const tokens = new Set<string>();
  for (const raw of [zone.city, zone.name, zone.display_name]) {
    if (typeof raw === "string" && raw.trim()) {
      tokens.add(normalizeGeoToken(raw));
      const first = raw.split(",")[0]?.trim();
      if (first) tokens.add(normalizeGeoToken(first));
    }
  }
  return [...tokens];
}

/**
 * Pick the best eligible geo zone for IP-detected location.
 * Pure function — no network calls.
 */
export function matchGeoZone(
  zones: GeoZoneMatchRow[],
  detected: DetectedLocation,
): string | null {
  if (!zones.length) return null;

  const country = normCountry(detected.country);
  const city = detected.city?.trim()
    ? normalizeGeoToken(detected.city)
    : null;
  const region = detected.region?.trim()
    ? detected.region.trim().toUpperCase()
    : null;

  if (!country && !city && !region) return null;

  const withCountry = (z: GeoZoneMatchRow) =>
    normCountry(z.country_code) === country;

  // 1. Exact city + country
  if (city && country) {
    const hit = zones.find(
      (z) =>
        withCountry(z) && zoneCityTokens(z).some((t) => t === city),
    );
    if (hit) return hit.id;
  }

  // 2. City alone
  if (city) {
    const hit = zones.find((z) =>
      zoneCityTokens(z).some((t) => t === city),
    );
    if (hit) return hit.id;
  }

  // 3. Region/state (region_code or city label after migration 156)
  if (region) {
    const hit = zones.find((z) => {
      const zRegion = z.region_code?.trim().toUpperCase();
      const zCity = z.city?.trim().toUpperCase();
      return zRegion === region || zCity === region;
    });
    if (hit) return hit.id;
  }

  // 4. Country alone — prefer lowest sort if multiple (caller passes ordered list)
  if (country) {
    const hit = zones.find((z) => normCountry(z.country_code) === country);
    if (hit) return hit.id;
  }

  return null;
}
