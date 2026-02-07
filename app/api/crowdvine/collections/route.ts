import { NextResponse } from "next/server";
import { fetchCollectionsData } from "@/lib/crowdvine/collections-data";

export async function GET() {
  try {
    const collections = await fetchCollectionsData();
    return NextResponse.json(collections);
  } catch (error) {
    console.error("Error fetching collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 },
    );
  }
}
