type MapboxModule = typeof import("mapbox-gl");
type MapboxGl = MapboxModule["default"];

let mapboxModulePromise: Promise<MapboxModule> | null = null;
let cssLoaded = false;
let telemetryGuardInstalled = false;

const DUMMY_ACCESS_TOKEN = "pk.dummy";
const MAPBOX_API_URL = "https://api.mapbox.com";
const MAPBOX_SESSION_PATH = "/map-sessions/v1";

/**
 * Mapbox GL nulls shared telemetry `errorCb` in `map.remove()`, then async
 * session/load callbacks still invoke it → `TypeError: this.errorCb is not a function`.
 * Common under React Strict Mode remounts.
 */
function installMapboxTelemetryGuard() {
  if (telemetryGuardInstalled || typeof window === "undefined") return;
  telemetryGuardInstalled = true;

  const isErrorCbRace = (value: unknown) => {
    const message =
      typeof value === "string"
        ? value
        : value instanceof Error
          ? value.message
          : "";
    return message.includes("errorCb is not a function");
  };

  window.addEventListener(
    "error",
    (event) => {
      if (
        isErrorCbRace(event.message) ||
        isErrorCbRace(event.error)
      ) {
        event.preventDefault();
      }
    },
    true,
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      if (isErrorCbRace(event.reason)) {
        event.preventDefault();
      }
    },
    true,
  );
}

export function preloadMapboxGl(): Promise<MapboxModule> {
  if (!mapboxModulePromise) {
    if (typeof document !== "undefined" && !cssLoaded) {
      cssLoaded = true;
      void import("mapbox-gl/dist/mapbox-gl.css");
    }
    mapboxModulePromise = import("mapbox-gl").then((mod) => {
      installMapboxTelemetryGuard();
      return mod;
    });
  }
  return mapboxModulePromise;
}

export async function getMapboxGl(): Promise<MapboxGl> {
  const mod = await preloadMapboxGl();
  return mod.default;
}

/** Apply access token and skip Mapbox session/telemetry when using OSM fallback. */
export function applyMapboxAccessToken(
  mapboxgl: MapboxGl,
  accessToken: string,
) {
  const isDummy = !accessToken || accessToken === DUMMY_ACCESS_TOKEN;
  mapboxgl.accessToken = isDummy ? DUMMY_ACCESS_TOKEN : accessToken;

  const config = (
    mapboxgl as MapboxGl & {
      config?: { API_URL: string | null; SESSION_PATH: string | null };
    }
  ).config;
  if (!config) return;

  if (isDummy) {
    config.API_URL = null;
    config.SESSION_PATH = null;
  } else {
    config.API_URL = MAPBOX_API_URL;
    config.SESSION_PATH = MAPBOX_SESSION_PATH;
  }
}

/** Safe teardown — Mapbox may throw during remove when telemetry races. */
export function safeRemoveMapboxMap(
  map: { remove: () => void } | null | undefined,
) {
  if (!map) return;
  try {
    map.remove();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("errorCb is not a function")) {
      throw error;
    }
  }
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
    accessToken: DUMMY_ACCESS_TOKEN,
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
