import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import {
  buildProducerInsert,
  PRODUCER_DB_SELECT,
  producerRowToApi,
} from "@/lib/catalog-mappers";
import { isCatalogCertification } from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/producers — list producers (name asc).
 * POST /api/producers — create producer.
 */
export async function GET(request: NextRequest) {
  const denied = requireCatalogApiAuth(request);
  if (denied) return denied;

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("producers")
      .select(PRODUCER_DB_SELECT)
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("list_producers error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      producers: (data ?? []).map((row) => producerRowToApi(row)),
    });
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

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("producers")
      .insert(buildProducerInsert(body))
      .select(PRODUCER_DB_SELECT)
      .single();

    if (error) {
      console.error("create_producer error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { producer: producerRowToApi(data) },
      { status: 201 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/producers:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
