import { NextRequest, NextResponse } from "next/server";
import { requireCatalogApiAuth } from "@/lib/catalog-api-auth";
import {
  buildWinePatch,
  WINE_DB_SELECT,
  wineRowToApi,
} from "@/lib/catalog-mappers";
import {
  isCatalogCertification,
  isCatalogWineType,
  isUuid,
} from "@/lib/catalog-types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function parseWineId(raw: string | undefined): string | null {
  const id = raw?.trim();
  if (!id || !isUuid(id)) return null;
  return id;
}

function wineDeleteConfirmed(
  request: NextRequest,
  body?: Record<string, unknown>,
): boolean {
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
      .from("wines")
      .select(WINE_DB_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ wine: wineRowToApi(data) });
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
        .from("producers")
        .select("id")
        .eq("id", patch.producer_id)
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
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await sb
      .from("wines")
      .update(patch)
      .eq("id", id)
      .select(WINE_DB_SELECT)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Wine not found" }, { status: 404 });
    }

    return NextResponse.json({ wine: wineRowToApi(data) });
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
          'Deletion not confirmed. Pass confirm=true as a query parameter or { "confirm": true } in the request body.',
      },
      { status: 400 },
    );
  }

  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("wines")
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
