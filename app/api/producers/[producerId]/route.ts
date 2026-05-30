import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import { isCatalogCertification, isUuid } from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const PRODUCER_COLUMNS =
  "id, name, region, subregion, country, founded_year, bio_short, bio_long, certification, contact_name, contact_email, created_at, updated_at";

function parseProducerId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id || !isUuid(id)) return null;
  return id;
}

function buildProducerPatch(body: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.region === "string") patch.region = body.region.trim();
  if (typeof body.country === "string") patch.country = body.country.trim();
  if (body.subregion === null) patch.subregion = null;
  else if (typeof body.subregion === "string") {
    patch.subregion = body.subregion.trim() || null;
  }
  if (body.founded_year === null) patch.founded_year = null;
  else if (typeof body.founded_year === "number" && Number.isInteger(body.founded_year)) {
    patch.founded_year = body.founded_year;
  }
  if (body.bio_short === null) patch.bio_short = null;
  else if (typeof body.bio_short === "string") patch.bio_short = body.bio_short;
  if (body.bio_long === null) patch.bio_long = null;
  else if (typeof body.bio_long === "string") patch.bio_long = body.bio_long;
  if (body.certification === null) patch.certification = null;
  else if (isCatalogCertification(body.certification)) {
    patch.certification = body.certification;
  }
  if (body.contact_name === null) patch.contact_name = null;
  else if (typeof body.contact_name === "string") {
    patch.contact_name = body.contact_name.trim() || null;
  }
  if (body.contact_email === null) patch.contact_email = null;
  else if (typeof body.contact_email === "string") {
    patch.contact_email = body.contact_email.trim() || null;
  }

  return patch;
}

/**
 * GET /api/producers/:producerId
 * PATCH /api/producers/:producerId
 * DELETE /api/producers/:producerId — soft delete (deleted_at).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ producerId: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { producerId: raw } = await params;
  const id = parseProducerId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid producer id" }, { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_producers")
      .select(PRODUCER_COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    return NextResponse.json({ producer: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ producerId: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { producerId: raw } = await params;
  const id = parseProducerId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid producer id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch = buildProducerPatch(body);

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
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

    patch.updated_at = new Date().toISOString();

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_producers")
      .update(patch)
      .eq("id", id)
      .is("deleted_at", null)
      .select(PRODUCER_COLUMNS)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    return NextResponse.json({ producer: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ producerId: string }> },
) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  const { producerId: raw } = await params;
  const id = parseProducerId(raw);
  if (!id) {
    return NextResponse.json({ error: "Invalid producer id" }, { status: 400 });
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("catalog_producers")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
