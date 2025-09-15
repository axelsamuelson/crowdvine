import { NextRequest, NextResponse } from "next/server";
import { getSiteContentByKey } from "@/lib/actions/content";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const value = await getSiteContentByKey(key);

    // Lägg till cache headers för bättre prestanda
    const response = NextResponse.json({ key, value });

    // Cache i 30 minuter
    response.headers.set(
      "Cache-Control",
      "public, max-age=1800, s-maxage=1800",
    );

    return response;
  } catch (error) {
    console.error("Error fetching site content:", error);
    return NextResponse.json(
      { error: "Failed to fetch site content" },
      { status: 500 },
    );
  }
}
