import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import {
  isCatalogCertification,
  isCatalogWineType,
  isUuid,
} from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const WINE_COLUMNS = `
  id,
  producer_id,
  name,
  vintage,
  appellation,
  grape_varieties,
  type,
  price_sek,
  bottle_size_ml,
  tasting_notes,
  alcohol_pct,
  farming,
  serving_temp_c,
  food_pairing,
  awards,
  import_price_eur,
  winemaker_notes,
  soil_type,
  elevation_masl,
  yield_hl_ha,
  ageing,
  is_published,
  created_at,
  updated_at
`;

function parseBoolQuery(value: string | null): boolean | undefined {
  if (value === null || value === "") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

/**
 * GET /api/wines — list catalog wines (filters: producer_id, type, is_published).
 * POST /api/wines — create catalog wine.
 */
export async function GET(request: NextRequest) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const producerId = searchParams.get("producer_id")?.trim();
    const type = searchParams.get("type")?.trim();
    const isPublished = parseBoolQuery(searchParams.get("is_published"));

    if (producerId && !isUuid(producerId)) {
      return NextResponse.json(
        { error: "Invalid producer_id" },
        { status: 400 },
      );
    }
    if (type && !isCatalogWineType(type)) {
      return NextResponse.json({ error: "Invalid type filter" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    let q = sb.from("catalog_wines").select(WINE_COLUMNS).order("name");

    if (producerId) q = q.eq("producer_id", producerId);
    if (type) q = q.eq("type", type);
    if (isPublished !== undefined) q = q.eq("is_published", isPublished);

    const { data, error } = await q;
    if (error) {
      console.error("list_wines error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wines: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const producerId =
      typeof body.producer_id === "string" ? body.producer_id.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const appellation =
      typeof body.appellation === "string" ? body.appellation.trim() : "";
    const type = body.type;
    const priceSek = body.price_sek;

    if (!producerId || !isUuid(producerId)) {
      return NextResponse.json(
        { error: "Valid producer_id is required" },
        { status: 400 },
      );
    }
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!appellation) {
      return NextResponse.json(
        { error: "appellation is required" },
        { status: 400 },
      );
    }
    if (!isCatalogWineType(type)) {
      return NextResponse.json({ error: "Valid type is required" }, { status: 400 });
    }
    if (typeof priceSek !== "number" || !Number.isInteger(priceSek) || priceSek < 0) {
      return NextResponse.json(
        { error: "price_sek must be a non-negative integer" },
        { status: 400 },
      );
    }

    if (
      body.farming !== undefined &&
      body.farming !== null &&
      !isCatalogCertification(body.farming)
    ) {
      return NextResponse.json({ error: "Invalid farming value" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    const { data: producer, error: producerErr } = await sb
      .from("catalog_producers")
      .select("id")
      .eq("id", producerId)
      .is("deleted_at", null)
      .maybeSingle();

    if (producerErr) {
      return NextResponse.json({ error: producerErr.message }, { status: 500 });
    }
    if (!producer) {
      return NextResponse.json(
        { error: "producer_id does not exist" },
        { status: 400 },
      );
    }

    const row: Record<string, unknown> = {
      producer_id: producerId,
      name,
      appellation,
      type,
      price_sek: priceSek,
      bottle_size_ml:
        typeof body.bottle_size_ml === "number" && Number.isInteger(body.bottle_size_ml)
          ? body.bottle_size_ml
          : 750,
      is_published: body.is_published === true,
    };

    if (body.vintage === null) row.vintage = null;
    else if (typeof body.vintage === "number" && Number.isInteger(body.vintage)) {
      row.vintage = body.vintage;
    }
    if (Array.isArray(body.grape_varieties)) {
      row.grape_varieties = body.grape_varieties.filter(
        (g): g is string => typeof g === "string",
      );
    }
    if (typeof body.tasting_notes === "string") row.tasting_notes = body.tasting_notes;
    if (typeof body.alcohol_pct === "number") row.alcohol_pct = body.alcohol_pct;
    if (isCatalogCertification(body.farming)) row.farming = body.farming;
    if (typeof body.serving_temp_c === "string") {
      row.serving_temp_c = body.serving_temp_c;
    }
    if (Array.isArray(body.food_pairing)) {
      row.food_pairing = body.food_pairing.filter(
        (x): x is string => typeof x === "string",
      );
    }
    if (Array.isArray(body.awards)) {
      row.awards = body.awards.filter((x): x is string => typeof x === "string");
    }
    if (typeof body.import_price_eur === "number") {
      row.import_price_eur = body.import_price_eur;
    }
    if (typeof body.winemaker_notes === "string") {
      row.winemaker_notes = body.winemaker_notes;
    }
    if (typeof body.soil_type === "string") row.soil_type = body.soil_type;
    if (typeof body.elevation_masl === "number" && Number.isInteger(body.elevation_masl)) {
      row.elevation_masl = body.elevation_masl;
    }
    if (typeof body.yield_hl_ha === "number") row.yield_hl_ha = body.yield_hl_ha;
    if (typeof body.ageing === "string") row.ageing = body.ageing;

    const { data, error } = await sb
      .from("catalog_wines")
      .insert(row)
      .select(WINE_COLUMNS)
      .single();

    if (error) {
      console.error("create_wine error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wine: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
