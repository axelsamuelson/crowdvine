import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

const CATEGORIES = new Set(["seo", "tiktok", "b2b", "product", "other"]);

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_analytics_annotations")
    .select("id, date, label, category, created_at")
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotations: data ?? [] });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyUnknown: unknown = await request.json().catch(() => null);
  const body =
    bodyUnknown && typeof bodyUnknown === "object"
      ? (bodyUnknown as {
          date?: unknown;
          label?: unknown;
          category?: unknown;
        })
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

  if (!date || !label || !category) {
    return NextResponse.json(
      { error: "date (YYYY-MM-DD), label, and category are required" },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("admin_analytics_annotations")
    .insert({ date, label, category })
    .select("id, date, label, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ annotation: data });
}
