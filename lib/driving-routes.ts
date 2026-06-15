import { hasValidGeoCoords } from "@/lib/geo-distance";

export type DrivingRoutePoint = {
  id: string;
  lat: number;
  lon: number;
};

export type DrivingRouteResult = {
  distanceMeters: number;
  durationSeconds: number;
  source: "mapbox" | "osrm" | "estimate";
};

export type DrivingRoutesResponse = Record<string, DrivingRouteResult>;

export type DurationMatrixResult = {
  producerIds: string[];
  durations: number[][];
  source: "mapbox" | "osrm";
};

export type OptimalPickupResult = {
  optimalProducerId: string;
  averageSecondsByProducer: Record<string, number>;
  source: "mapbox" | "osrm";
};

function formatPointsList(points: DrivingRoutePoint[]): string {
  return points.map((p) => `${p.lon},${p.lat}`).join(";");
}

async function fetchMapboxDurationMatrix(
  points: DrivingRoutePoint[],
  accessToken: string,
): Promise<DurationMatrixResult | null> {
  if (points.length < 2) return null;

  const coordinates = formatPointsList(points);
  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}` +
    `?annotations=duration&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    code?: string;
    durations?: Array<Array<number | null>>;
  };

  if (data.code !== "Ok" || !data.durations) return null;

  const durations = data.durations.map((row) =>
    row.map((value) => (value == null ? Number.POSITIVE_INFINITY : value)),
  );

  return {
    producerIds: points.map((p) => p.id),
    durations,
    source: "mapbox",
  };
}

async function fetchOsrmDurationMatrix(
  points: DrivingRoutePoint[],
): Promise<DurationMatrixResult | null> {
  if (points.length < 2) return null;

  const coordinates = formatPointsList(points);
  const url =
    `https://router.project-osrm.org/table/v1/driving/${coordinates}` +
    `?annotations=duration`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    code?: string;
    durations?: number[][];
  };

  if (data.code !== "Ok" || !data.durations) return null;

  return {
    producerIds: points.map((p) => p.id),
    durations: data.durations,
    source: "osrm",
  };
}

export async function fetchDrivingDurationMatrix(
  points: DrivingRoutePoint[],
): Promise<DurationMatrixResult | null> {
  const validPoints = points.filter((p) => hasValidGeoCoords(p.lat, p.lon));
  if (validPoints.length < 2) return null;

  const mapboxToken =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "";

  if (mapboxToken && mapboxToken !== "pk.dummy") {
    const mapboxMatrix = await fetchMapboxDurationMatrix(
      validPoints,
      mapboxToken,
    );
    if (mapboxMatrix) return mapboxMatrix;
  }

  return fetchOsrmDurationMatrix(validPoints);
}

/** Producer that minimizes average driving time to all other producers on the pallet. */
export function computeOptimalPickupByAverageDriveTime(
  matrix: DurationMatrixResult,
): OptimalPickupResult | null {
  const { producerIds, durations, source } = matrix;
  const n = producerIds.length;
  if (n < 2) return null;

  const averageSecondsByProducer: Record<string, number> = {};
  let bestId = producerIds[0];
  let bestAverage = Number.POSITIVE_INFINITY;

  for (let i = 0; i < n; i++) {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const seconds = durations[i]?.[j];
      if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) continue;
      sum += seconds;
      count += 1;
    }
    if (count === 0) continue;

    const average = sum / count;
    averageSecondsByProducer[producerIds[i]] = average;

    if (
      average < bestAverage ||
      (average === bestAverage &&
        producerIds[i].localeCompare(bestId, "sv") < 0)
    ) {
      bestAverage = average;
      bestId = producerIds[i];
    }
  }

  if (!Number.isFinite(bestAverage)) return null;

  return {
    optimalProducerId: bestId,
    averageSecondsByProducer,
    source,
  };
}

export async function findOptimalPickupByAverageDriveTime(
  points: DrivingRoutePoint[],
): Promise<OptimalPickupResult | null> {
  const matrix = await fetchDrivingDurationMatrix(points);
  if (!matrix) return null;
  return computeOptimalPickupByAverageDriveTime(matrix);
}

function formatCoordinateList(
  pickup: { lat: number; lon: number },
  destinations: DrivingRoutePoint[],
): string {
  const points = [
    `${pickup.lon},${pickup.lat}`,
    ...destinations.map((d) => `${d.lon},${d.lat}`),
  ];
  return points.join(";");
}

async function fetchMapboxDrivingRoutes(
  pickup: { lat: number; lon: number },
  destinations: DrivingRoutePoint[],
  accessToken: string,
): Promise<DrivingRoutesResponse | null> {
  if (destinations.length === 0) return {};

  const coordinates = formatCoordinateList(pickup, destinations);
  const destinationIndices = destinations
    .map((_, index) => String(index + 1))
    .join(";");

  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coordinates}` +
    `?sources=0&destinations=${destinationIndices}` +
    `&annotations=distance,duration&access_token=${encodeURIComponent(accessToken)}`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error("Mapbox Matrix API error:", response.status, await response.text());
    return null;
  }

  const data = (await response.json()) as {
    code?: string;
    distances?: Array<Array<number | null>>;
    durations?: Array<Array<number | null>>;
  };

  if (data.code !== "Ok" || !data.distances?.[0] || !data.durations?.[0]) {
    return null;
  }

  const routes: DrivingRoutesResponse = {};
  for (let i = 0; i < destinations.length; i++) {
    const distanceMeters = data.distances[0][i];
    const durationSeconds = data.durations[0][i];
    if (distanceMeters == null || durationSeconds == null) continue;

    routes[destinations[i].id] = {
      distanceMeters,
      durationSeconds,
      source: "mapbox",
    };
  }

  return routes;
}

async function fetchOsrmDrivingRoutes(
  pickup: { lat: number; lon: number },
  destinations: DrivingRoutePoint[],
): Promise<DrivingRoutesResponse | null> {
  if (destinations.length === 0) return {};

  const coordinates = formatCoordinateList(pickup, destinations);
  const destinationIndices = destinations
    .map((_, index) => String(index + 1))
    .join(";");

  const url =
    `https://router.project-osrm.org/table/v1/driving/${coordinates}` +
    `?sources=0&destinations=${destinationIndices}&annotations=distance,duration`;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error("OSRM table API error:", response.status);
    return null;
  }

  const data = (await response.json()) as {
    code?: string;
    distances?: number[][];
    durations?: number[][];
  };

  if (data.code !== "Ok" || !data.distances?.[0] || !data.durations?.[0]) {
    return null;
  }

  const routes: DrivingRoutesResponse = {};
  for (let i = 0; i < destinations.length; i++) {
    const distanceMeters = data.distances[0][i];
    const durationSeconds = data.durations[0][i];
    if (distanceMeters == null || durationSeconds == null) continue;

    routes[destinations[i].id] = {
      distanceMeters,
      durationSeconds,
      source: "osrm",
    };
  }

  return routes;
}

export async function fetchDrivingRoutesFromPickup(
  pickup: { lat: number; lon: number },
  destinations: DrivingRoutePoint[],
): Promise<DrivingRoutesResponse> {
  const validDestinations = destinations.filter((d) =>
    hasValidGeoCoords(d.lat, d.lon),
  );

  if (validDestinations.length === 0) return {};

  const mapboxToken =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "";

  if (mapboxToken && mapboxToken !== "pk.dummy") {
    const mapboxRoutes = await fetchMapboxDrivingRoutes(
      pickup,
      validDestinations,
      mapboxToken,
    );
    if (mapboxRoutes && Object.keys(mapboxRoutes).length > 0) {
      return mapboxRoutes;
    }
  }

  const osrmRoutes = await fetchOsrmDrivingRoutes(pickup, validDestinations);
  if (osrmRoutes && Object.keys(osrmRoutes).length > 0) {
    return osrmRoutes;
  }

  return {};
}
