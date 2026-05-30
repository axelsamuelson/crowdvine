import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import { isCatalogCertification } from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PRODUCER_COLUMNS =
  "id, name, region, subregion, country, founded_year, bio_short, bio_long, certification, contact_name, contact_email, created_at, updated_at";

/**
 * GET /api/producers — list catalog producers (name asc).
 * POST /api/producers — create catalog producer.
 */
export async function GET(request: NextRequest) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_producers")
      .select(PRODUCER_COLUMNS)
      .is("deleted_at", null)
      .order("name");

    if (error) {
      console.error("list_producers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ producers: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/producers:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : "";
    const country =
      typeof body.country === "string" && body.country.trim()
        ? body.country.trim()
        : "France";

    if (!name || !region) {
      return NextResponse.json(
        { error: "name and region are required" },
        { status: 400 },
      );
    }

    if (
      body.certification !== undefined &&
      body.certification !== null &&
      !isCatalogCertification(body.certification)
    ) {
      return NextResponse.json(
        { error: "Invalid certification value" },
        { status: 400 },
      );
    }

    const row: Record<string, unknown> = {
      name,
      region,
      country,
    };

    if (typeof body.subregion === "string") row.subregion = body.subregion.trim() || null;
    if (typeof body.founded_year === "number" && Number.isInteger(body.founded_year)) {
      row.founded_year = body.founded_year;
    }
    if (typeof body.bio_short === "string") row.bio_short = body.bio_short;
    if (typeof body.bio_long === "string") row.bio_long = body.bio_long;
    if (isCatalogCertification(body.certification)) {
      row.certification = body.certification;
    }
    if (typeof body.contact_name === "string") {
      row.contact_name = body.contact_name.trim() || null;
    }
    if (typeof body.contact_email === "string") {
      row.contact_email = body.contact_email.trim() || null;
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_producers")
      .insert(row)
      .select(PRODUCER_COLUMNS)
      .single();

    if (error) {
      console.error("create_producer error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ producer: data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/producers:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
