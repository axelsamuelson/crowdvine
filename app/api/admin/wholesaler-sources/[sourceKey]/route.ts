import { NextRequest, NextResponse } from "next/server";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";
import { normalizeWholesalerSourceKey } from "@/lib/admin/wholesaler-source-key";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function decodeSourceKeyParam(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceKey: string }> },
) {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

    const { sourceKey: raw } = await params;
    const sourceKey = normalizeWholesalerSourceKey(decodeSourceKeyParam(raw));
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("wholesaler_sources")
      .select(
        "source_key, name, contact_email, address_street, address_postcode, address_city, address_country, contact_locale, updated_at",
      )
      .eq("source_key", sourceKey)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ source: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sourceKey: string }> },
) {
  try {
    const auth = await requireAdminOr401();
    if (isUnauthorizedResponse(auth)) return auth;

    const { sourceKey: raw } = await params;
    const sourceKey = normalizeWholesalerSourceKey(decodeSourceKeyParam(raw));
    const body = (await request.json()) as {
      name?: string;
      contact_email?: string | null;
      address_street?: string | null;
      address_postcode?: string | null;
      address_city?: string | null;
      address_country?: string | null;
      contact_locale?: string | null;
    };

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json(
        { error: "Namn krävs" },
        { status: 400 },
      );
    }

    const localeRaw =
      typeof body.contact_locale === "string"
        ? body.contact_locale.trim().toLowerCase()
        : "fr";
    const contact_locale = localeRaw || "fr";
    if (contact_locale.length < 2 || contact_locale.length > 8) {
      return NextResponse.json(
        { error: "Språk måste vara 2–8 tecken" },
        { status: 400 },
      );
    }

    const strOrNull = (v: unknown): string | null => {
      if (v === null || v === undefined) return null;
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t || null;
    };

    const row = {
      source_key: sourceKey,
      name,
      contact_email: strOrNull(body.contact_email),
      address_street: strOrNull(body.address_street),
      address_postcode: strOrNull(body.address_postcode),
      address_city: strOrNull(body.address_city),
      address_country: strOrNull(body.address_country),
      contact_locale,
      updated_at: new Date().toISOString(),
    };

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("wholesaler_sources")
      .upsert(row, { onConflict: "source_key" })
      .select(
        "source_key, name, contact_email, address_street, address_postcode, address_city, address_country, contact_locale, updated_at",
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ source: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
