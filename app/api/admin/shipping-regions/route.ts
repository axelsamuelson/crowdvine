import { NextRequest, NextResponse } from "next/server";
import { listShippingRegions } from "@/lib/admin/lager-frakt-reads";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

    const regions = await listShippingRegions(getSupabaseAdmin());
    return NextResponse.json({ regions });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET shipping-regions:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

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
