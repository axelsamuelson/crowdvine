import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { TOP_100_PRODUCERS } from "@/lib/guides/top-100-producers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const TOP_100_NAMES = new Set(TOP_100_PRODUCERS.map((p) => p.name));

const patchSchema = z.object({
  verdict: z.enum(["recommended", "avoid"]).optional(),
  category: z
    .enum(["red", "white", "orange", "sparkling", "rose", "budget"])
    .optional(),
  editorial_note_sv: z.string().min(1).optional(),
  editorial_note_en: z.string().optional().nullable(),
  producer_note_sv: z.string().optional().nullable(),
  producer_note_en: z.string().optional().nullable(),
  top_100_producer_name: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_published: z.boolean().optional(),
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

  const patch: Record<string, unknown> = { ...parsed.data };
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
  const { data, error } = await sb
    .from("systembolaget_curated")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { error } = await sb
    .from("systembolaget_curated")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
