import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  week: z.coerce.number().int().min(1).max(53),
});

const upsertSchema = z.object({
  issue_year: z.number().int().min(2000).max(2100),
  issue_week: z.number().int().min(1).max(53),
  product_number: z.string().min(1),
  editorial_note_sv: z.string().min(1),
  editorial_note_en: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
});

const publishSchema = z.object({
  issue_year: z.number().int().min(2000).max(2100),
  issue_week: z.number().int().min(1).max(53),
  is_published: z.boolean(),
});

type FeaturedHit = {
  product_number: string;
  source: string;
  context: string | null;
  featured_at: string;
};

async function loadFeaturedMap(
  productNumbers: string[],
): Promise<Map<string, FeaturedHit[]>> {
  const map = new Map<string, FeaturedHit[]>();
  if (productNumbers.length === 0) return map;

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_featured_history")
    .select("product_number, source, context, featured_at")
    .in("product_number", productNumbers);

  if (error) {
    console.error("[recommendations featured]", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const pn = row.product_number as string;
    const list = map.get(pn) ?? [];
    list.push({
      product_number: pn,
      source: row.source as string,
      context: (row.context as string | null) ?? null,
      featured_at: row.featured_at as string,
    });
    map.set(pn, list);
  }
  return map;
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    year: request.nextUrl.searchParams.get("year"),
    week: request.nextUrl.searchParams.get("week"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("systembolaget_recommendations")
    .select("*")
    .eq("issue_year", parsed.data.year)
    .eq("issue_week", parsed.data.week)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const numbers = (rows ?? []).map((row) => row.product_number as string);
  const productByNumber = new Map<
    string,
    {
      name_bold: string | null;
      name_thin: string | null;
      producer_name: string | null;
      price: number | null;
      is_available: boolean | null;
    }
  >();

  if (numbers.length > 0) {
    const { data: products, error: productsError } = await sb
      .from("systembolaget_products")
      .select(
        "product_number, name_bold, name_thin, producer_name, price, is_available",
      )
      .in("product_number", numbers);

    if (productsError) {
      return NextResponse.json(
        { error: productsError.message },
        { status: 500 },
      );
    }

    for (const product of products ?? []) {
      productByNumber.set(product.product_number as string, {
        name_bold: product.name_bold as string | null,
        name_thin: product.name_thin as string | null,
        producer_name: product.producer_name as string | null,
        price: product.price as number | null,
        is_available: product.is_available as boolean | null,
      });
    }
  }

  const featured = await loadFeaturedMap(numbers);

  return NextResponse.json({
    year: parsed.data.year,
    week: parsed.data.week,
    rows: (rows ?? []).map((row) => {
      const product = productByNumber.get(row.product_number as string) ?? null;
      return {
        ...row,
        product,
        unavailable: !product || product.is_available !== true,
        featuredHistory: featured.get(row.product_number as string) ?? [],
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const isPublished = parsed.data.is_published ?? false;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_recommendations")
    .upsert(
      {
        issue_year: parsed.data.issue_year,
        issue_week: parsed.data.issue_week,
        product_number: parsed.data.product_number,
        editorial_note_sv: parsed.data.editorial_note_sv,
        editorial_note_en: parsed.data.editorial_note_en ?? null,
        sort_order: parsed.data.sort_order ?? 100,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
      },
      { onConflict: "issue_year,issue_week,product_number" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const featured = await loadFeaturedMap([parsed.data.product_number]);

  return NextResponse.json({
    row: data,
    featuredHistory: featured.get(parsed.data.product_number) ?? [],
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = publishSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_recommendations")
    .update({
      is_published: parsed.data.is_published,
      published_at: parsed.data.is_published
        ? new Date().toISOString()
        : null,
    })
    .eq("issue_year", parsed.data.issue_year)
    .eq("issue_week", parsed.data.issue_week)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
