import { NextRequest, NextResponse } from "next/server";
import {
  fetchDrivingRoutesFromPickup,
  type DrivingRoutePoint,
} from "@/lib/driving-routes";
import { hasValidGeoCoords } from "@/lib/geo-distance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pickup = body.pickup as { lat?: number; lon?: number } | undefined;
    const destinations = (body.destinations ?? []) as DrivingRoutePoint[];

    if (!pickup || !hasValidGeoCoords(pickup.lat, pickup.lon)) {
      return NextResponse.json(
        { error: "Valid pickup coordinates required" },
        { status: 400 },
      );
    }

    const routes = await fetchDrivingRoutesFromPickup(
      { lat: pickup.lat!, lon: pickup.lon! },
      destinations,
    );

    const source =
      Object.values(routes)[0]?.source ??
      (process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN
        ? "mapbox"
        : "osrm");

    return NextResponse.json({ routes, source });
  } catch (error) {
    console.error("B2B pallet routing error:", error);
    return NextResponse.json(
      { error: "Failed to fetch driving routes" },
      { status: 500 },
    );
  }
}
