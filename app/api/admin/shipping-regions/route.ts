import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function requireAdmin(request: NextRequest): boolean {
  return Boolean(request.cookies.get("admin-auth")?.value);
}

export async function GET(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    const { data: regions, error: regErr } = await sb
      .from("shipping_regions")
      .select("id, name, country_code, description, created_at, updated_at")
      .order("name");

    if (regErr) {
      console.error("shipping_regions list error:", regErr);
      return NextResponse.json({ error: regErr.message }, { status: 500 });
    }

    const { data: producers, error: prodErr } = await sb
      .from("producers")
      .select("shipping_region_id")
      .not("shipping_region_id", "is", null);

    if (prodErr) {
      console.error("producers count for regions error:", prodErr);
      return NextResponse.json({ error: prodErr.message }, { status: 500 });
    }

    const countByRegion = new Map<string, number>();
    for (const row of producers ?? []) {
      const rid = row.shipping_region_id as string | null;
      if (!rid) continue;
      countByRegion.set(rid, (countByRegion.get(rid) ?? 0) + 1);
    }

    const withCounts = (regions ?? []).map((r) => ({
      ...r,
      producer_count: countByRegion.get(r.id) ?? 0,
    }));

    return NextResponse.json({ regions: withCounts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET shipping-regions:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      name?: string;
      country_code?: string;
      description?: string | null;
    };

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const rawCode =
      typeof body.country_code === "string"
        ? body.country_code.trim().toUpperCase()
        : "";
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (rawCode.length !== 2) {
      return NextResponse.json(
        { error: "country_code must be exactly 2 characters" },
        { status: 400 },
      );
    }

    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : body.description === null
          ? null
          : null;

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("shipping_regions")
      .insert({
        name,
        country_code: rawCode,
        description,
      })
      .select()
      .single();

    if (error) {
      console.error("shipping_regions insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ region: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
