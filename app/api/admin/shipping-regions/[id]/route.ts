import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function requireAdmin(request: NextRequest): boolean {
  return Boolean(request.cookies.get("admin-auth")?.value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();

    const { data, error } = await sb
      .from("shipping_regions")
      .select("id, name, country_code, description, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { count, error: countErr } = await sb
      .from("producers")
      .select("id", { count: "exact", head: true })
      .eq("shipping_region_id", id);

    if (countErr) {
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    return NextResponse.json({
      region: { ...data, producer_count: count ?? 0 },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      country_code?: string;
      description?: string | null;
    };

    const patch: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      const n = typeof body.name === "string" ? body.name.trim() : "";
      if (!n) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      patch.name = n;
    }
    if (body.country_code !== undefined) {
      const c =
        typeof body.country_code === "string"
          ? body.country_code.trim().toUpperCase()
          : "";
      if (c.length !== 2) {
        return NextResponse.json(
          { error: "country_code must be exactly 2 characters" },
          { status: 400 },
        );
      }
      patch.country_code = c;
    }
    if (body.description !== undefined) {
      patch.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : body.description === null
            ? null
            : null;
    }

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("shipping_regions")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ region: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sb = getSupabaseAdmin();

    const { error } = await sb.from("shipping_regions").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
