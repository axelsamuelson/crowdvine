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

function parseWineId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id || !isUuid(id)) return null;
  return id;
}

function buildWinePatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof body.producer_id === "string" && isUuid(body.producer_id.trim())) {
    patch.producer_id = body.producer_id.trim();
  }
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (body.vintage === null) patch.vintage = null;
  else if (typeof body.vintage === "number" && Number.isInteger(body.vintage)) {
    patch.vintage = body.vintage;
  }
  if (typeof body.appellation === "string") {
    patch.appellation = body.appellation.trim();
  }
  if (Array.isArray(body.grape_varieties)) {
    patch.grape_varieties = body.grape_varieties.filter(
      (g): g is string => typeof g === "string",
    );
  }
  if (isCatalogWineType(body.type)) patch.type = body.type;
  if (typeof body.price_sek === "number" && Number.isInteger(body.price_sek)) {
    patch.price_sek = body.price_sek;
  }
  if (typeof body.bottle_size_ml === "number" && Number.isInteger(body.bottle_size_ml)) {
    patch.bottle_size_ml = body.bottle_size_ml;
  }
  if (body.tasting_notes === null) patch.tasting_notes = null;
  else if (typeof body.tasting_notes === "string") patch.tasting_notes = body.tasting_notes;
  if (typeof body.alcohol_pct === "number") patch.alcohol_pct = body.alcohol_pct;
  if (body.farming === null) patch.farming = null;
  else if (isCatalogCertification(body.farming)) patch.farming = body.farming;
  if (body.serving_temp_c === null) patch.serving_temp_c = null;
  else if (typeof body.serving_temp_c === "string") {
    patch.serving_temp_c = body.serving_temp_c;
  }
  if (Array.isArray(body.food_pairing)) {
    patch.food_pairing = body.food_pairing.filter(
      (x): x is string => typeof x === "string",
    );
  }
  if (Array.isArray(body.awards)) {
    patch.awards = body.awards.filter((x): x is string => typeof x === "string");
  }
  if (body.import_price_eur === null) patch.import_price_eur = null;
  else if (typeof body.import_price_eur === "number") {
    patch.import_price_eur = body.import_price_eur;
  }
  if (body.winemaker_notes === null) patch.winemaker_notes = null;
  else if (typeof body.winemaker_notes === "string") {
    patch.winemaker_notes = body.winemaker_notes;
  }
  if (body.soil_type === null) patch.soil_type = null;
  else if (typeof body.soil_type === "string") patch.soil_type = body.soil_type;
  if (body.elevation_masl === null) patch.elevation_masl = null;
  else if (typeof body.elevation_masl === "number" && Number.isInteger(body.elevation_masl)) {
    patch.elevation_masl = body.elevation_masl;
  }
  if (body.yield_hl_ha === null) patch.yield_hl_ha = null;
  else if (typeof body.yield_hl_ha === "number") patch.yield_hl_ha = body.yield_hl_ha;
  if (body.ageing === null) patch.ageing = null;
  else if (typeof body.ageing === "string") patch.ageing = body.ageing;
  if (typeof body.is_published === "boolean") patch.is_published = body.is_published;

  return patch;
}

function wineDeleteConfirmed(request: NextRequest, body?: Record<string, unknown>): boolean {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("confirm");
  if (q === "true" || q === "1") return true;
  return body?.confirm === true;
}

/**
 * GET /api/wines/:id
 * PATCH /api/wines/:id
 * DELETE /api/wines/:id — requires confirm=true (query or JSON body).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { id: raw } = await params;
  const id = parseWineId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid wine id" }, { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_wines")
      .select(WINE_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ wine: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { id: raw } = await params;
  const id = parseWineId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid wine id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = buildWinePatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
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
    if (body.type !== undefined && !isCatalogWineType(body.type)) {
      return NextResponse.json({ error: "Invalid type value" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    if (typeof patch.producer_id === "string") {
      const { data: producer, error: producerErr } = await sb
        .from("catalog_producers")
        .select("id")
        .eq("id", patch.producer_id)
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
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from("catalog_wines")
      .update(patch)
      .eq("id", id)
      .select(WINE_COLUMNS)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ wine: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { id: raw } = await params;
  const id = parseWineId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid wine id" }, { status: 400 });
  }

  let body: Record<string, unknown> | undefined;
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as Record<string, unknown>;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!wineDeleteConfirmed(request, body)) {
    return NextResponse.json(
      {
        error:
          "Deletion not confirmed. Pass confirm=true as a query parameter or { \"confirm\": true } in the request body.",
      },
      { status: 400 },
    );
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_wines")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
