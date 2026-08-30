import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Strip PostgREST filter metacharacters from user input
  const safe = q.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
  if (safe.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const sb = getSupabaseAdmin();
  const pattern = `%${safe}%`;
  const quoted = `"${pattern.replace(/"/g, "")}"`;

  const { data, error } = await sb
    .from("systembolaget_products")
    .select(
      [
        "product_number",
        "name_bold",
        "name_thin",
        "producer_name",
        "category_level_2",
        "country",
        "price",
        "vintage",
        "assortment_text",
        "is_available",
        "image_url",
      ].join(", "),
    )
    .or(
      `producer_name.ilike.${quoted},name_bold.ilike.${quoted},name_thin.ilike.${quoted}`,
    )
    .order("producer_name", { ascending: true })
    .limit(40);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
