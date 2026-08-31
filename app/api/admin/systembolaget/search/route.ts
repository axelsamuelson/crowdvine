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

  const numbers = (data ?? []).map((row) => row.product_number as string);
  const featuredByNumber = new Map<
    string,
    Array<{ source: string; context: string | null; featured_at: string }>
  >();

  if (numbers.length > 0) {
    const { data: featured, error: featuredError } = await sb
      .from("systembolaget_featured_history")
      .select("product_number, source, context, featured_at")
      .in("product_number", numbers);

    if (featuredError) {
      console.error("[systembolaget search featured]", featuredError.message);
    } else {
      for (const row of featured ?? []) {
        const pn = row.product_number as string;
        const list = featuredByNumber.get(pn) ?? [];
        list.push({
          source: row.source as string,
          context: (row.context as string | null) ?? null,
          featured_at: row.featured_at as string,
        });
        featuredByNumber.set(pn, list);
      }
    }
  }

  return NextResponse.json({
    results: (data ?? []).map((row) => ({
      ...row,
      featuredHistory: featuredByNumber.get(row.product_number as string) ?? [],
    })),
  });
}
