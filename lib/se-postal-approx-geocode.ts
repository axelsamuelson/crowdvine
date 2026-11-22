/**
 * Offline SE postcode → approximate lat/lon when Mapbox is unavailable.
 *
 * Used only as a geocode substitute so delivery-zone *radius* matching can still
 * run (Göteborg / Malmö / Uppsala / …). Does NOT invent a Stockholm delivery
 * zone for non-Stockholm postals — callers still match against real zone rows.
 *
 * Centroids are coarse (2-digit postcode bands). Fine enough for 40–150 km
 * pallet radii; Kiruna 98xxx stays far outside Stockholm radii.
 */

export type SePostalApproxGeocode = {
  lat: number;
  lon: number;
  /** Human label for logs / display_name. */
  place: string;
  /** Two-digit postcode band used. */
  band: string;
};

/** Extract first 5-digit SE postal from a free-form address / query. */
export function extractSePostalDigits(
  address: string | null | undefined,
): string | null {
  const m = String(address ?? "").match(/\b(\d{5})\b/);
  return m?.[1] ?? null;
}

/**
 * Approximate WGS84 for a Swedish 5-digit postcode via 2-digit band.
 * Returns null when the band is unknown (do not guess Stockholm).
 */
export function approxGeocodeSePostal(
  postcode: string | null | undefined,
): SePostalApproxGeocode | null {
  const digits = String(postcode ?? "").replace(/\D/g, "");
  if (digits.length < 2) return null;
  const band = digits.slice(0, 2);
  const n = Number.parseInt(band, 10);
  if (!Number.isFinite(n)) return null;

  // Bands aligned with major SE city clusters + known pallet delivery radii.
  // Sources: city centers (same order of magnitude as prod pallet_zones).
  const table: Record<string, { lat: number; lon: number; place: string }> = {
    // Stockholm county ~10–19
    "10": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "11": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "12": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "13": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "14": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "15": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "16": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "17": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "18": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    "19": { lat: 59.3293, lon: 18.0686, place: "Stockholm" },
    // Skåne / Malmö ~20–23
    "20": { lat: 55.605, lon: 13.0038, place: "Malmö" },
    "21": { lat: 55.605, lon: 13.0038, place: "Malmö" },
    "22": { lat: 55.605, lon: 13.0038, place: "Malmö" },
    "23": { lat: 55.605, lon: 13.0038, place: "Malmö" },
    // Helsingborg ~25
    "25": { lat: 56.0465, lon: 12.6945, place: "Helsingborg" },
    // Växjö / Småland ~35
    "35": { lat: 56.8777, lon: 14.8091, place: "Växjö" },
    // Göteborg / Västra Götaland ~40–44
    "40": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "41": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "42": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "43": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    "44": { lat: 57.7089, lon: 11.9746, place: "Göteborg" },
    // Linköping ~58
    "58": { lat: 58.4108, lon: 15.6214, place: "Linköping" },
    // Norrköping ~60
    "60": { lat: 58.5877, lon: 16.1924, place: "Norrköping" },
    // Örebro ~70
    "70": { lat: 59.2753, lon: 15.2134, place: "Örebro" },
    // Västerås ~72
    "72": { lat: 59.6099, lon: 16.5448, place: "Västerås" },
    // Uppsala ~75
    "75": { lat: 59.8586, lon: 17.6389, place: "Uppsala" },
    // Gävle ~80
    "80": { lat: 60.6749, lon: 17.1413, place: "Gävle" },
    // Sundsvall ~85
    "85": { lat: 62.3908, lon: 17.3069, place: "Sundsvall" },
    // Umeå ~90
    "90": { lat: 63.8258, lon: 20.263, place: "Umeå" },
    // Luleå ~97
    "97": { lat: 65.5842, lon: 22.1547, place: "Luleå" },
    // Kiruna ~98
    "98": { lat: 67.8558, lon: 20.2253, place: "Kiruna" },
  };

  const hit = table[band];
  if (!hit) return null;
  return { lat: hit.lat, lon: hit.lon, place: hit.place, band };
}
