import * as d3 from "d3";
import { feature } from "topojson-client";

export const FRANCE_TOPO_WIDTH = 1000;
export const FRANCE_TOPO_HEIGHT = 620;

export const METROPOLITAN_REGION_CODES = new Set([
  "11",
  "24",
  "27",
  "28",
  "32",
  "44",
  "52",
  "53",
  "75",
  "76",
  "84",
  "93",
  "94",
]);

export type FranceGeoFeature = {
  type: string;
  id?: string;
  geometry: d3.GeoGeometryObjects | null;
  properties: Record<string, unknown>;
};

export type FranceTopoDot = { x: number; y: number };

export type FranceMapCity = {
  name: string;
  lon: number;
  lat: number;
};

/** Major cities shown as reference points on the PDP topo map. */
export const FRANCE_MAJOR_CITIES: FranceMapCity[] = [
  { name: "Paris", lon: 2.3522, lat: 48.8566 },
  { name: "Lyon", lon: 4.8357, lat: 45.764 },
  { name: "Marseille", lon: 5.3698, lat: 43.2965 },
  { name: "Bordeaux", lon: -0.5792, lat: 44.8378 },
  { name: "Toulouse", lon: 1.4442, lat: 43.6047 },
  { name: "Nantes", lon: -1.5534, lat: 47.2184 },
  { name: "Strasbourg", lon: 7.7521, lat: 48.5734 },
  { name: "Montpellier", lon: 3.8767, lat: 43.6108 },
  { name: "Lille", lon: 3.0573, lat: 50.6292 },
  { name: "Nice", lon: 7.262, lat: 43.7102 },
  { name: "Rennes", lon: -1.6778, lat: 48.1173 },
  { name: "Dijon", lon: 5.0415, lat: 47.322 },
];

export function getCode(f: FranceGeoFeature): string {
  return (
    String(f?.properties?.code ?? "").trim() ||
    String(f?.properties?.CODE ?? "").trim() ||
    String(f?.properties?.insee ?? "").trim()
  );
}

export function getName(f: FranceGeoFeature): string {
  return (
    String(f?.properties?.name ?? "").trim() ||
    String(f?.properties?.nom ?? "").trim() ||
    String(f?.properties?.NOM ?? "").trim() ||
    String(f?.properties?.libelle ?? "").trim() ||
    getCode(f)
  );
}

export function isMetropolitanRegion(regionCode: string) {
  return METROPOLITAN_REGION_CODES.has(String(regionCode || "").trim());
}

export function isInMetropolitanFrance(lat: number, lon: number) {
  return lat >= 41 && lat <= 51.2 && lon >= -5.5 && lon <= 9.8;
}

export function toFeatures(data: unknown): FranceGeoFeature[] {
  if (!data || typeof data !== "object") return [];

  const record = data as Record<string, unknown>;

  if (record.type === "FeatureCollection" && Array.isArray(record.features)) {
    return record.features as FranceGeoFeature[];
  }

  if (record.type === "Topology") {
    const objects = record.objects as Record<string, unknown> | undefined;
    const obj =
      objects?.france ||
      objects?.regions ||
      objects?.departments ||
      Object.values(objects || {})[0];
    if (!obj) return [];
    return (
      (feature(record as Parameters<typeof feature>[0], obj as Parameters<typeof feature>[1])
        .features as FranceGeoFeature[]) || []
    );
  }

  return [];
}

export function findRegionAtPoint(
  regions: FranceGeoFeature[],
  lon: number,
  lat: number,
): FranceGeoFeature | null {
  for (const region of regions) {
    try {
      if (d3.geoContains(region as d3.GeoPermissibleObjects, [lon, lat])) {
        return region;
      }
    } catch {
      // ignore invalid geometries
    }
  }
  return null;
}

export function findRegionByName(
  regions: FranceGeoFeature[],
  name: string | null | undefined,
): FranceGeoFeature | null {
  if (!name?.trim()) return null;
  const normalized = name.trim().toLowerCase();

  return (
    regions.find((region) => {
      const regionName = getName(region).toLowerCase();
      return (
        regionName.includes(normalized) ||
        normalized.includes(regionName) ||
        normalized
          .split(/[\s,/]+/)
          .some((part) => part.length > 3 && regionName.includes(part))
      );
    }) ?? null
  );
}

export function createFranceProjection(
  focusFeature: d3.GeoPermissibleObjects,
  width = FRANCE_TOPO_WIDTH,
  height = FRANCE_TOPO_HEIGHT,
  padding = 48,
) {
  return d3
    .geoMercator()
    .fitExtent(
      [[padding, padding], [width - padding, height - padding]],
      focusFeature,
    );
}

export function createFullFranceProjection(
  regions: FranceGeoFeature[],
  width = FRANCE_TOPO_WIDTH,
  height = FRANCE_TOPO_HEIGHT,
  padding = 72,
) {
  return createFranceProjection(
    {
      type: "FeatureCollection",
      features: regions,
    } as d3.GeoPermissibleObjects,
    width,
    height,
    padding,
  );
}

export function getRegionLabel(name: string): string {
  const shortNames: Record<string, string> = {
    "Provence-Alpes-Côte d'Azur": "Provence",
    "Provence-Alpes-Cote d'Azur": "Provence",
    "Bourgogne-Franche-Comté": "Bourgogne",
    "Bourgogne-Franche-Comte": "Bourgogne",
    "Centre-Val de Loire": "Centre-Loire",
    "Auvergne-Rhône-Alpes": "Rhône-Alpes",
    "Auvergne-Rhone-Alpes": "Rhône-Alpes",
  };

  return shortNames[name] ?? name;
}

export function generateDotsInFeature(
  feat: FranceGeoFeature,
  projection: d3.GeoProjection,
  geoPath: d3.GeoPath,
  targetCount: number,
): FranceTopoDot[] {
  const bounds = geoPath.bounds(feat as d3.GeoPermissibleObjects);
  const [[x0, y0], [x1, y1]] = bounds;
  const dots: FranceTopoDot[] = [];
  const maxAttempts = Math.max(2000, targetCount * 30);
  let attempts = 0;

  while (dots.length < targetCount && attempts < maxAttempts) {
    attempts += 1;
    const x = x0 + Math.random() * (x1 - x0);
    const y = y0 + Math.random() * (y1 - y0);
    const lngLat = projection.invert([x, y]);
    if (!lngLat) continue;
    if (d3.geoContains(feat as d3.GeoPermissibleObjects, lngLat)) {
      dots.push({ x, y });
    }
  }

  return dots;
}

let loadPromise: Promise<FranceGeoFeature[]> | null = null;

export function loadFranceRegions(): Promise<FranceGeoFeature[]> {
  if (!loadPromise) {
    loadPromise = fetch("/france_regions_metropolitan.json")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load France regions (${res.status})`);
        }
        const data = await res.json();
        return toFeatures(data).filter((region) =>
          isMetropolitanRegion(getCode(region)),
        );
      })
      .catch((error) => {
        loadPromise = null;
        throw error;
      });
  }
  return loadPromise;
}
