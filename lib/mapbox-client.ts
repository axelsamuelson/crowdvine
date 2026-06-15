type MapboxModule = typeof import("mapbox-gl");
type MapboxGl = MapboxModule["default"];

let mapboxModulePromise: Promise<MapboxModule> | null = null;
let cssLoaded = false;

export function preloadMapboxGl(): Promise<MapboxModule> {
  if (!mapboxModulePromise) {
    if (typeof document !== "undefined" && !cssLoaded) {
      cssLoaded = true;
      void import("mapbox-gl/dist/mapbox-gl.css");
    }
    mapboxModulePromise = import("mapbox-gl");
  }
  return mapboxModulePromise;
}

export async function getMapboxGl(): Promise<MapboxGl> {
  const mod = await preloadMapboxGl();
  return mod.default;
}

export type MapStylePreset = "light" | "outdoors" | "satellite";

const MAPBOX_STYLE_URLS: Record<MapStylePreset, string> = {
  light: "mapbox://styles/mapbox/light-v11",
  outdoors: "mapbox://styles/mapbox/outdoors-v12",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
};

function getOsmFallbackStyle(preset: MapStylePreset) {
  const voyagerTiles = [
    "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
  ];
  const osmTiles = ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"];

  const tiles = preset === "light" ? osmTiles : voyagerTiles;
  const attribution =
    preset === "light"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return {
    version: 8 as const,
    sources: {
      "osm-tiles": {
        type: "raster" as const,
        tiles,
        tileSize: 256,
        attribution,
      },
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster" as const,
        source: "osm-tiles",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

export function getMapStyle(
  mapboxToken: string | undefined,
  preset: MapStylePreset = "light",
) {
  if (mapboxToken) {
    return {
      accessToken: mapboxToken,
      style: MAPBOX_STYLE_URLS[preset],
    };
  }

  return {
    accessToken: "pk.dummy",
    style: getOsmFallbackStyle(preset),
  };
}

export function ignoreMapboxAuthErrors(map: {
  on: (event: string, cb: (e: { error?: { message?: string } }) => void) => void;
}) {
  map.on("error", (e) => {
    const message = e.error?.message ?? "";
    if (
      message.includes("token") ||
      message.includes("Access Token") ||
      message.includes("Unauthorized") ||
      message.includes("Forbidden")
    ) {
      return;
    }
  });
}
