import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import {
  buildProducerPatch,
  PRODUCER_DB_SELECT,
  producerRowToApi,
} from "@/lib/catalog-mappers";
import { isCatalogCertification, isUuid } from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function parseProducerId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id || !isUuid(id)) return null;
  return id;
}

/**
 * GET /api/producers/:producerId
 * PATCH /api/producers/:producerId
 * DELETE /api/producers/:producerId — sets status inactive.
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
      .from("producers")
      .select(PRODUCER_DB_SELECT)
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    return NextResponse.json({ producer: producerRowToApi(data) });
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

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("producers")
      .update(patch)
      .eq("id", id)
      .eq("status", "active")
      .select(PRODUCER_DB_SELECT)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Producer not found" }, { status: 404 });
    }

    return NextResponse.json({ producer: producerRowToApi(data) });
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
      .from("producers")
      .update({ status: "inactive", is_live: false })
      .eq("id", id)
      .eq("status", "active")
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
