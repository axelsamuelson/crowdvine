/** Haversine distance between two coordinates in kilometers. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function hasValidGeoCoords(
  lat?: number | null,
  lon?: number | null,
): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    !(lat === 0 && lon === 0)
  );
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function formatDistanceMeters(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Rough driving time from straight-line distance (rural roads). */
export function estimateDrivingMinutes(straightLineKm: number): number {
  const ROAD_FACTOR = 1.35;
  const AVG_SPEED_KMH = 50;
  const roadKm = straightLineKm * ROAD_FACTOR;
  return Math.max(1, Math.round((roadKm / AVG_SPEED_KMH) * 60));
}

export function formatDrivingTime(minutes: number, approximate = true): string {
  const prefix = approximate ? "~" : "";
  if (minutes < 60) return `${prefix}${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (remainder === 0) return `${prefix}${hours} h`;
  return `${prefix}${hours} h ${remainder} min`;
}

export function formatDrivingTimeFromSeconds(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return formatDrivingTime(minutes, false);
}
