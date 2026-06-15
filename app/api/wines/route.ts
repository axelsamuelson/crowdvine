import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import {
  buildWineInsert,
  ensureUniqueWineHandle,
  WINE_DB_SELECT,
  wineRowToApi,
} from "@/lib/catalog-mappers";
import {
  isCatalogCertification,
  isCatalogWineColor,
  isCatalogWineType,
  isUuid,
} from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function parseBoolQuery(value: string | null): boolean | undefined {
  if (value === null || value === "") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
}

/**
 * GET /api/wines — list wines (filters: producer_id, type, is_published).
 * POST /api/wines — create wine.
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
    let q = sb.from("wines").select(WINE_DB_SELECT).order("wine_name");

    if (producerId) q = q.eq("producer_id", producerId);
    if (type) q = q.eq("color", type);
    if (isPublished !== undefined) q = q.eq("is_live", isPublished);

    const { data, error } = await q;
    if (error) {
      console.error("list_wines error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      wines: (data ?? []).map((row) => wineRowToApi(row)),
    });
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
    const color = body.color;
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
    if (
      !isCatalogWineType(type) &&
      !(typeof color === "string" && isCatalogWineColor(color))
    ) {
      return NextResponse.json(
        { error: "Valid type or color is required" },
        { status: 400 },
      );
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
      .from("producers")
      .select("id")
      .eq("id", producerId)
      .eq("status", "active")
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

    const row = buildWineInsert(body);
    row.handle = await ensureUniqueWineHandle(sb, row.handle as string);

    const { data, error } = await sb
      .from("wines")
      .insert(row)
      .select(WINE_DB_SELECT)
      .single();

    if (error) {
      console.error("create_wine error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ wine: wineRowToApi(data) }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
