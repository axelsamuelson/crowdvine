import { NextRequest, NextResponse } from "next/server";
import { PRODUCER_DB_SELECT } from "@/lib/catalog-mappers";
import {
  extractWineText,
  type WineLocale,
} from "@/lib/i18n/wine-locale";
import { generateProducerSlug } from "@/lib/producer-handle";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ProducerRow = {
  id: string;
  name: string;
  region: string | null;
  subregion: string | null;
  country_code: string | null;
  founded_year: number | null;
  short_description: unknown;
  bio_long: unknown;
  certification: string | null;
  contact_name: string | null;
};

type WineRow = {
  id: string;
  wine_name: string;
  vintage: string | null;
  handle: string;
  color: string | null;
  base_price_cents: number | null;
  summary: unknown;
  grape_varieties: string | null;
  appellation: string | null;
  is_live: boolean | null;
  farming: string | null;
};

function mapWineRow(row: WineRow, locale: WineLocale) {
  return {
    id: row.id,
    wine_name: row.wine_name,
    vintage: row.vintage,
    handle: row.handle,
    type: row.color,
    color: row.color,
    price_sek:
      row.base_price_cents != null
        ? Math.round(row.base_price_cents / 100)
        : 0,
    summary: extractWineText(
      row.summary as Record<string, string> | string | null,
      locale,
    ),
    grape_varieties: row.grape_varieties,
    appellation: row.appellation,
    is_published: row.is_live === true,
    farming: row.farming,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug?.trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const locale = (request.headers.get("x-pact-locale") ?? "sv") as WineLocale;

  try {
    const sb = getSupabaseAdmin();

    const { data: producers, error: producersError } = await sb
      .from("producers")
      .select(PRODUCER_DB_SELECT)
      .eq("status", "active");

    if (producersError) {
      return NextResponse.json(
        { error: producersError.message },
        { status: 500 },
      );
    }

    const producer = (producers ?? []).find(
      (row) => generateProducerSlug(String((row as ProducerRow).name)) === slug,
    ) as ProducerRow | undefined;

    if (!producer) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    const { data: wines, error: winesError } = await sb
      .from("wines")
      .select(
        "id, wine_name, vintage, handle, color, base_price_cents, summary, grape_varieties, appellation, is_live, farming",
      )
      .eq("producer_id", producer.id)
      .eq("is_live", true);

    if (winesError) {
      return NextResponse.json({ error: winesError.message }, { status: 500 });
    }

    return NextResponse.json({
      producer: {
        id: producer.id,
        name: producer.name,
        region: producer.region,
        subregion: producer.subregion,
        country: producer.country_code,
        founded_year: producer.founded_year,
        certification: producer.certification,
        contact_name: producer.contact_name,
        bio_short: extractWineText(
          producer.short_description as Record<string, string> | string | null,
          locale,
        ),
        bio_long: extractWineText(
          producer.bio_long as Record<string, string> | string | null,
          locale,
        ),
        slug: generateProducerSlug(producer.name),
      },
      wines: (wines ?? []).map((row) =>
        mapWineRow(row as WineRow, locale),
      ),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
