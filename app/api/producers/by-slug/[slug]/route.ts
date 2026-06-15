import { NextRequest, NextResponse } from "next/server";
import { getProducerBySlugForLocale } from "@/lib/crowdvine/producer-by-slug-data";
import type { AppLocale } from "@/lib/i18n/locale";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const locale = (request.headers.get("x-pact-locale") ?? "sv") as AppLocale;

  try {
    const data = await getProducerBySlugForLocale(rawSlug, locale);
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
