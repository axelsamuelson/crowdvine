import { NextRequest, NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const result = await geocodeAddress(query);
  if ("error" in result) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  return NextResponse.json(
    { lat: result.lat, lon: result.lon },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
