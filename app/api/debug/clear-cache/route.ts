import { NextResponse } from "next/server";
import { clearGeocodeCache } from "@/lib/geocoding";

export async function POST() {
  try {
    clearGeocodeCache();
    return NextResponse.json({
      success: true,
      message: "Geocoding cache cleared successfully",
    });
  } catch (error) {
    console.error("❌ Error clearing cache:", error);
    return NextResponse.json(
      {
        error: "Failed to clear cache",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
