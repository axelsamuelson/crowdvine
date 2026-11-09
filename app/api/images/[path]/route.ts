import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** Serve static default wine as 200 bytes — never redirect (breaks /_next/image). */
async function defaultWineResponse(): Promise<NextResponse> {
  try {
    const filePath = path.join(process.cwd(), "public", "default-wine.png");
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> },
) {
  try {
    const resolvedParams = await params;
    const { path: rawPath } = resolvedParams;

    if (!rawPath) {
      return defaultWineResponse();
    }

    const cleanPath = rawPath.trim().replace(/\n/g, "");

    if (!cleanPath || /^default-wine\.png$/i.test(cleanPath)) {
      return defaultWineResponse();
    }

    if (cleanPath.startsWith("http")) {
      return NextResponse.redirect(cleanPath);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from("uploads")
      .download(cleanPath);

    if (error || !data) {
      if (error) console.error("Error downloading file:", error);
      return defaultWineResponse();
    }

    const buffer = await data.arrayBuffer();
    const extension = cleanPath.split(".").pop()?.toLowerCase();
    let contentType = "image/jpeg";
    switch (extension) {
      case "png":
        contentType = "image/png";
        break;
      case "gif":
        contentType = "image/gif";
        break;
      case "webp":
        contentType = "image/webp";
        break;
      case "svg":
        contentType = "image/svg+xml";
        break;
    }

    const isLogo = cleanPath.toLowerCase().includes("logo");
    const cacheControl = isLogo
      ? "no-cache, no-store, must-revalidate"
      : "public, max-age=31536000, immutable";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
        ...(isLogo
          ? { Pragma: "no-cache", Expires: "0" }
          : {}),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return defaultWineResponse();
  }
}
