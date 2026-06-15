import { NextResponse } from "next/server";
import { getCrowdvineProductByHandle } from "@/lib/crowdvine/product-by-handle-data";
import type { AppLocale } from "@/lib/i18n/locale";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const locale = (request.headers.get("x-pact-locale") ?? "sv") as AppLocale;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  try {
    const product = await getCrowdvineProductByHandle({ handle, locale, host });
    if (!product) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}
