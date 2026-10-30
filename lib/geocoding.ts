// Geocoding via Mapbox Geocoding API (MAPBOX_ACCESS_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN)

export interface GeocodeResult {
  lat: number;
  lon: number;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

export interface GeocodeError {
  error: string;
  message: string;
}

type MapboxContextItem = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  center?: [number, number];
  place_name?: string;
  text?: string;
  address?: string;
  context?: MapboxContextItem[];
};

const GEOCODE_COUNTRY_CODES = "se,no,dk,fi,fr,de,gb,es,it";

// Cache for geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, GeocodeResult>();

function getMapboxAccessToken(): string | null {
  const token =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "";
  if (!token || token === "pk.dummy") return null;
  return token;
}

function contextText(
  context: MapboxContextItem[] | undefined,
  prefix: string,
): string | undefined {
  const item = context?.find((c) => c.id?.startsWith(`${prefix}.`));
  return item?.text || undefined;
}

function contextCountryCode(
  context: MapboxContextItem[] | undefined,
): string | undefined {
  const item = context?.find((c) => c.id?.startsWith("country."));
  const code = item?.short_code;
  return code ? code.toUpperCase() : undefined;
}

function mapboxFeatureToGeocodeResult(feature: MapboxFeature): GeocodeResult | null {
  const lon = feature.center?.[0];
  const lat = feature.center?.[1];
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const context = feature.context;
  const city =
    contextText(context, "place") ||
    contextText(context, "locality") ||
    contextText(context, "district");

  return {
    lat,
    lon,
    display_name: feature.place_name || feature.text || `${lat}, ${lon}`,
    address: {
      house_number: feature.address,
      road: feature.text,
      city,
      postcode: contextText(context, "postcode"),
      country: contextText(context, "country"),
      country_code: contextCountryCode(context),
    },
  };
}

async function fetchMapboxGeocode(
  query: string,
  options: { country?: string } = {},
): Promise<GeocodeResult | GeocodeError> {
  const token = getMapboxAccessToken();
  if (!token) {
    return {
      error: "GEOCODING_UNAVAILABLE",
      message:
        "Geocoding unavailable: MAPBOX_ACCESS_TOKEN / NEXT_PUBLIC_MAPBOX_TOKEN is not configured",
    };
  }

  const country = options.country || GEOCODE_COUNTRY_CODES;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${encodeURIComponent(query)}.json` +
    `?access_token=${encodeURIComponent(token)}` +
    `&limit=1` +
    `&country=${encodeURIComponent(country)}` +
    `&language=en`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Geocoding API error: ${response.status}`);
  }

  const data = (await response.json()) as { features?: MapboxFeature[] };
  const feature = data.features?.[0];
  if (!feature) {
    return {
      error: "NO_RESULTS",
      message: "No coordinates found for this address",
    };
  }

  const geocodeResult = mapboxFeatureToGeocodeResult(feature);
  if (!geocodeResult) {
    return {
      error: "NO_RESULTS",
      message: "No coordinates found for this address",
    };
  }

  return geocodeResult;
}

// Function to clear geocoding cache (useful for debugging)
export function clearGeocodeCache() {
  geocodeCache.clear();
  console.log("🧹 Geocoding cache cleared");
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodeResult | GeocodeError> {
  // Clean and normalize the address
  const cleanAddress = address.trim().replace(/\s+/g, " ");

  // Check cache first
  if (geocodeCache.has(cleanAddress)) {
    console.log("📍 Using cached geocode result for:", cleanAddress);
    return geocodeCache.get(cleanAddress)!;
  }

  // Retry logic for geocoding
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🌍 Geocoding address (attempt ${attempt}/${maxRetries}):`,
        cleanAddress,
      );

      const result = await fetchMapboxGeocode(cleanAddress);
      if ("error" in result) {
        if (result.error === "GEOCODING_UNAVAILABLE") return result;
        if (result.error === "NO_RESULTS") {
          // Try fallback with a simpler address before giving up
          break;
        }
        return result;
      }

      geocodeCache.set(cleanAddress, result);

      console.log("✅ Geocoded successfully:", {
        address: cleanAddress,
        lat: result.lat,
        lon: result.lon,
        city: result.address?.city,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `❌ Geocoding attempt ${attempt} failed:`,
        lastError.message,
      );

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed or no results — try simpler Sweden-focused fallback
  console.error("❌ Primary geocoding failed, trying fallback...");

  try {
    console.log("🔄 Trying fallback geocoding...");
    const simpleAddress = address.split(",")[0] + ", Sweden";

    const fallback = await fetchMapboxGeocode(simpleAddress, { country: "se" });
    if (!("error" in fallback)) {
      geocodeCache.set(cleanAddress, fallback);

      console.log("✅ Fallback geocoding successful:", {
        address: cleanAddress,
        lat: fallback.lat,
        lon: fallback.lon,
      });

      return fallback;
    }
  } catch (fallbackError) {
    console.error("❌ Fallback geocoding also failed:", fallbackError);
  }

  return {
    error: "GEOCODING_FAILED",
    message: `Failed to geocode address after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
  };
}

// Helper function to create a full address string
export function createFullAddress(parts: {
  street?: string;
  postcode?: string;
  city?: string;
  country?: string;
}): string {
  const addressParts = [];

  if (parts.street) addressParts.push(parts.street);
  if (parts.postcode) addressParts.push(parts.postcode);
  if (parts.city) addressParts.push(parts.city);
  if (parts.country) addressParts.push(parts.country);

  return addressParts.join(", ");
}

// Helper function to geocode from separate address fields
export async function geocodeFromFields(fields: {
  street?: string;
  postcode?: string;
  city: string;
  country: string;
}): Promise<GeocodeResult | GeocodeError> {
  // Validate required fields
  if (!fields.city || !fields.country) {
    return {
      error: "MISSING_REQUIRED_FIELDS",
      message: "City and country are required for geocoding",
    };
  }

  // Create address string from fields
  const addressParts = [];

  if (fields.street) addressParts.push(fields.street);
  if (fields.postcode) addressParts.push(fields.postcode);
  addressParts.push(fields.city);
  addressParts.push(fields.country);

  const fullAddress = addressParts.join(", ");

  return await geocodeAddress(fullAddress);
}

// Helper function to validate coordinates
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
