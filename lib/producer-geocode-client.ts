import { hasValidGeoCoords } from "@/lib/geo-distance";

const clientGeocodeCache = new Map<string, { lat: number; lon: number }>();

export type GeocodableProducer = {
  name: string;
  lat?: number | null;
  lon?: number | null;
  subregion?: string | null;
  region?: string | null;
};

export function buildProducerGeocodeQuery(
  producer: GeocodableProducer,
): string | null {
  const subregion = producer.subregion?.trim();
  const region = producer.region?.trim();
  if (subregion) return `${subregion}, France`;
  if (region) return `${region}, France`;
  return null;
}

export async function geocodeProducerQuery(
  query: string,
): Promise<{ lat: number; lon: number } | null> {
  const cached = clientGeocodeCache.get(query);
  if (cached) return cached;

  try {
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { lat?: number; lon?: number };
    if (typeof data.lat !== "number" || typeof data.lon !== "number") {
      return null;
    }
    const coords = { lat: data.lat, lon: data.lon };
    clientGeocodeCache.set(query, coords);
    return coords;
  } catch {
    return null;
  }
}

export async function resolveProducerCoordinates(
  producer: GeocodableProducer,
): Promise<{ lat: number; lon: number; approximate: boolean } | null> {
  if (hasValidGeoCoords(producer.lat, producer.lon)) {
    return {
      lat: producer.lat!,
      lon: producer.lon!,
      approximate: false,
    };
  }

  const query = buildProducerGeocodeQuery(producer);
  if (!query) return null;

  const coords = await geocodeProducerQuery(query);
  if (!coords) return null;

  return { ...coords, approximate: true };
}

export async function resolveManyProducerCoordinates<
  T extends GeocodableProducer,
>(
  producers: T[],
): Promise<
  Array<
    | { producer: T; lat: number; lon: number; approximate: boolean }
    | { producer: T; unresolved: true }
  >
> {
  return Promise.all(
    producers.map(async (producer) => {
      const coords = await resolveProducerCoordinates(producer);
      if (!coords) return { producer, unresolved: true as const };
      return { producer, ...coords };
    }),
  );
}
