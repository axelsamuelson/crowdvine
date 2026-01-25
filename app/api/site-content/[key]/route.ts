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

    // Returnera tom sträng om inget värde hittas istället för null
    const response = NextResponse.json({ key, value: value || "" });

    // För logo-nycklar, använd kortare cache eller no-cache för att säkerställa att nya loggor visas direkt
    if (key === "header_logo" || key === "footer_logo") {
      response.headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate",
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    } else {
      // Cache i 30 minuter för andra content
      response.headers.set(
        "Cache-Control",
        "public, max-age=1800, s-maxage=1800",
      );
    }

    return response;
  } catch (error) {
    console.error("Error fetching site content:", error);
    // Returnera tom sträng istället för 500-fel för att undvika krasch
    return NextResponse.json({ key: (await params).key, value: "" });
  }
}
