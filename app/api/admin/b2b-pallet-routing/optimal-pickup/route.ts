import { NextRequest, NextResponse } from "next/server";
import {
  findOptimalPickupByAverageDriveTime,
  type DrivingRoutePoint,
} from "@/lib/driving-routes";
import { hasValidGeoCoords } from "@/lib/geo-distance";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const producers = (body.producers ?? []) as DrivingRoutePoint[];

    const validProducers = producers.filter((p) =>
      hasValidGeoCoords(p.lat, p.lon),
    );

    if (validProducers.length < 2) {
      return NextResponse.json(
        { error: "At least two producers with coordinates required" },
        { status: 400 },
      );
    }

    const result = await findOptimalPickupByAverageDriveTime(validProducers);
    if (!result) {
      return NextResponse.json(
        { error: "Could not compute optimal pickup" },
        { status: 502 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Optimal pickup routing error:", error);
    return NextResponse.json(
      { error: "Failed to compute optimal pickup" },
      { status: 500 },
    );
  }
}
