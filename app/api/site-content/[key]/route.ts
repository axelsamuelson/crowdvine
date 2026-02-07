import { NextRequest, NextResponse } from "next/server";
import { getSiteContentByKey } from "@/lib/actions/content";

function resolveLogoKeyByHost(baseKey: string, host: string | null): string {
  if (!host) return baseKey;
  const h = host.toLowerCase().split(":")[0];
  // dirtywine.se = B2B (Dirty Wine). pactwines.com + localhost = PACT (B2C). localhost + ?b2b=1 = Dirty Wine (handled elsewhere)
  const isB2B = h.includes("dirtywine.se");
  const isPACT = h.includes("pactwines.com") || h === "localhost" || h === "127.0.0.1";
  const suffix = isB2B ? "_dirtywine" : isPACT ? "_pact" : null;
  if (!suffix) return baseKey;
  const suffixKeys = ["header_logo", "footer_logo", "alternative_logo"];
  return suffixKeys.includes(baseKey) ? `${baseKey}${suffix}` : baseKey;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await params;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    let value: string | null;
    if (key === "header_logo" || key === "footer_logo" || key === "alternative_logo") {
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? null;
      const resolvedKey = resolveLogoKeyByHost(key, host);
      value = await getSiteContentByKey(resolvedKey);
      if (value == null || value === "") {
        value = await getSiteContentByKey(key);
      }
    } else {
      value = await getSiteContentByKey(key);
    }

    // Returnera tom sträng om inget värde hittas istället för null
    const response = NextResponse.json({ key, value: value || "" });

    // För logo-nycklar, använd kortare cache eller no-cache för att säkerställa att nya loggor visas direkt
    const logoKeys = ["header_logo", "footer_logo", "alternative_logo", "header_logo_pact", "footer_logo_pact", "alternative_logo_pact", "header_logo_dirtywine", "footer_logo_dirtywine", "alternative_logo_dirtywine"];
    if (logoKeys.includes(key)) {
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
