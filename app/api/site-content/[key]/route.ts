import { NextRequest, NextResponse } from "next/server";
import { getSiteContentByKey } from "@/lib/actions/content";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    const value = await getSiteContentByKey(key);
    
    // Returnera tom sträng om inget värde hittas istället för null
    const response = NextResponse.json({ key, value: value || "" });
    
    // Cache i 30 minuter
    response.headers.set('Cache-Control', 'public, max-age=1800, s-maxage=1800');
    
    return response;
  } catch (error) {
    console.error("Error fetching site content:", error);
    // Returnera tom sträng istället för 500-fel för att undvika krasch
    return NextResponse.json({ key: (await params).key, value: "" });
  }
}
