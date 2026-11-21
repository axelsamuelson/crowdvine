import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { parseAnalyticsV2Filters } from "@/lib/analytics/v2/filters";
import { fetchStatusLine } from "@/lib/analytics/v2/queries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set([
  "release",
  "campaign",
  "kampanj",
  "seo",
  "incident",
  "other",
  "product",
  "tiktok",
  "b2b",
]);

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filters = parseAnalyticsV2Filters(request.nextUrl.searchParams);
  const status = await fetchStatusLine(filters);
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_analytics_annotations")
    .select(
      "id, date, occurred_at, label, category, site, url, source, pr_number, created_at",
    )
    .order("occurred_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      {
        status,
        annotations: [],
        error:
          "Anteckningarna kunde inte hämtas. Graferna visas utan markeringar.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ status, annotations: data ?? [], error: null });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  const body =
    bodyUnknown && typeof bodyUnknown === "object"
      ? (bodyUnknown as Record<string, unknown>)
      : null;

  const date =
    typeof body?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : null;
  const label =
    typeof body?.label === "string" && body.label.trim()
      ? body.label.trim().slice(0, 200)
      : null;
  const category =
    typeof body?.category === "string" && CATEGORIES.has(body.category)
      ? body.category
      : null;
  const site =
    body?.site === "pact" || body?.site === "dirtywine" || body?.site === "both"
      ? body.site
      : "pact";
  const url = typeof body?.url === "string" ? body.url.slice(0, 500) : null;
  const occurred_at =
    typeof body?.occurred_at === "string" && body.occurred_at
      ? body.occurred_at
      : date
        ? `${date}T12:00:00+01:00`
        : null;

  if (!date || !label || !category) {
    return NextResponse.json(
      { error: "Datum, titel och kategori krävs." },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_analytics_annotations")
    .insert({
      date,
      label,
      category,
      site,
      url,
      occurred_at,
      source: "manual",
      created_by: admin.id,
    })
    .select(
      "id, date, occurred_at, label, category, site, url, source, pr_number, created_at",
    )
    .single();

  if (error) {
    console.warn("[analytics/v2/releases] insert:", error.message);
    return NextResponse.json(
      { error: "Kunde inte spara anteckningen." },
      { status: 500 },
    );
  }

  return NextResponse.json({ annotation: data });
}

export async function DELETE(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id krävs" }, { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("admin_analytics_annotations")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json(
      { error: "Kunde inte ta bort anteckningen." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
