import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TOP_100_NAMES = new Set(TOP_100_PRODUCERS.map((p) => p.name));

function normalizeTop100Name(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!TOP_100_NAMES.has(trimmed)) {
    throw new Error(
      `top_100_producer_name must be an exact TOP_100_PRODUCERS name (got "${trimmed}")`,
    );
  }
  return trimmed;
}

const curatedSchema = z
  .object({
    product_number: z.string().min(1),
    verdict: z.enum(["recommended", "avoid", "skipped"]),
    category: z.enum([
      "red",
      "white",
      "orange",
      "sparkling",
      "rose",
      "budget",
      "glouglou",
      "petnat",
      "best",
    ]),
    editorial_note_sv: z.string().min(1),
    editorial_note_en: z.string().optional().nullable(),
    producer_note_sv: z.string().optional().nullable(),
    producer_note_en: z.string().optional().nullable(),
    top_100_producer_name: z.string().optional().nullable(),
    skip_reason_sv: z.string().optional().nullable(),
    skip_reason_en: z.string().optional().nullable(),
    sort_order: z.number().int().optional(),
    is_published: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.verdict !== "skipped") return;
    if (!value.skip_reason_sv?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skip_reason_sv"],
        message: "skip_reason_sv is required when verdict is skipped",
      });
    }
  });

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();

  // LEFT JOIN via two queries so unavailable products still show
  const { data: curated, error } = await sb
    .from("systembolaget_curated")
    .select("*")
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const numbers = (curated ?? []).map((row) => row.product_number as string);
  const productByNumber = new Map<
    string,
    {
      name_bold: string | null;
      name_thin: string | null;
      producer_name: string | null;
      price: number | null;
      is_available: boolean | null;
      availability_state: string | null;
      store_count: number | null;
    }
  >();

  if (numbers.length > 0) {
    const { data: products, error: productsError } = await sb
      .from("systembolaget_products")
      .select(
        "product_number, name_bold, name_thin, producer_name, price, is_available, availability_state, store_count",
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
        availability_state: product.availability_state as string | null,
        store_count: product.store_count as number | null,
      });
    }
  }

  const rows = (curated ?? []).map((row) => {
    const product = productByNumber.get(row.product_number as string) ?? null;
    const state = product?.availability_state ?? null;
    return {
      ...row,
      product,
      unavailable: !product || state === "unavailable" || state == null,
      limited: state === "limited",
    };
  });

  return NextResponse.json({ rows });
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

  const parsed = curatedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let top100: string | null;
  try {
    top100 = normalizeTop100Name(parsed.data.top_100_producer_name) ?? null;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  const skipped = parsed.data.verdict === "skipped";
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("systembolaget_curated")
    .upsert(
      {
        product_number: parsed.data.product_number,
        verdict: parsed.data.verdict,
        category: parsed.data.category,
        editorial_note_sv: parsed.data.editorial_note_sv,
        editorial_note_en: parsed.data.editorial_note_en ?? null,
        producer_note_sv: parsed.data.producer_note_sv ?? null,
        producer_note_en: parsed.data.producer_note_en ?? null,
        top_100_producer_name: top100,
        skip_reason_sv: parsed.data.skip_reason_sv?.trim() || null,
        skip_reason_en: parsed.data.skip_reason_en?.trim() || null,
        sort_order: parsed.data.sort_order ?? 100,
        // Skipped reviews must not appear on public lists.
        is_published: skipped ? false : (parsed.data.is_published ?? false),
      },
      { onConflict: "product_number,category" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ row: data });
}
