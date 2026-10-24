import { NextRequest, NextResponse } from "next/server";
import { getShippingRegion } from "@/lib/admin/lager-frakt-reads";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

    const { id } = await params;
    const region = await getShippingRegion(getSupabaseAdmin(), id);
    if (!region) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ region });
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
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

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
