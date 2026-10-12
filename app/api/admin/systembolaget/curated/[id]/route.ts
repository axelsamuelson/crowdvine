import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  publishCuratedById,
  revalidateSystembolagetGuideCategory,
} from "@/lib/systembolaget/publish-curated";

export const dynamic = "force-dynamic";

const TOP_100_NAMES = new Set(TOP_100_PRODUCERS.map((p) => p.name));

const patchSchema = z
  .object({
    verdict: z.enum(["recommended", "avoid", "skipped"]).optional(),
    category: z
      .enum([
        "red",
        "white",
        "orange",
        "sparkling",
        "rose",
        "budget",
        "glouglou",
        "petnat",
        "best",
      ])
      .optional(),
    editorial_note_sv: z.string().min(1).optional(),
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
    if (value.skip_reason_sv !== undefined && !value.skip_reason_sv?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skip_reason_sv"],
        message: "skip_reason_sv is required when verdict is skipped",
      });
    }
  });

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await context.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Admin publish toggle: same helper as scripted publishes (availability +
  // first_published_at + cache revalidation).
  const keys = Object.keys(parsed.data);
  if (keys.length === 1 && parsed.data.is_published === true) {
    const result = await publishCuratedById(id);
    if (!result.ok) {
      const status =
        result.reason === "not_found"
          ? 404
          : result.reason === "unavailable" || result.reason === "skipped_verdict"
            ? 409
            : 500;
      return NextResponse.json({ error: result.message, reason: result.reason }, { status });
    }
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("systembolaget_curated")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ row: data });
  }

  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.verdict === "skipped") {
    patch.is_published = false;
  }
  if ("top_100_producer_name" in patch) {
    const raw = patch.top_100_producer_name;
    if (raw == null || (typeof raw === "string" && !raw.trim())) {
      patch.top_100_producer_name = null;
    } else if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!TOP_100_NAMES.has(trimmed)) {
        return NextResponse.json(
          {
            error: `top_100_producer_name must be an exact TOP_100_PRODUCERS name (got "${trimmed}")`,
          },
          { status: 400 },
        );
      }
      patch.top_100_producer_name = trimmed;
    }
  }

  const sb = getSupabaseAdmin();
  const { data: before } = await sb
    .from("systembolaget_curated")
    .select("category, is_published, first_published_at")
    .eq("id", id)
    .maybeSingle();

  if (parsed.data.is_published === true && before && !before.is_published) {
    patch.first_published_at = before.first_published_at ?? new Date().toISOString();
  }

  const { data, error } = await sb
    .from("systembolaget_curated")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const categories = new Set<string>();
  if (before?.category) categories.add(String(before.category));
  if (data?.category) categories.add(String(data.category));
  for (const category of categories) {
    revalidateSystembolagetGuideCategory(category);
  }

  return NextResponse.json({ row: data });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: idRaw } = await context.params;
  const id = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("systembolaget_curated")
    .select("category")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("systembolaget_curated").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing?.category) {
    revalidateSystembolagetGuideCategory(String(existing.category));
  }

  return NextResponse.json({ ok: true });
}
