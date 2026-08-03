import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const createSchema = z.object({
  code: z.string().min(1).max(64),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["percent", "sek"]),
  value: z.number().positive(),
  applies_to: z.enum(["order", "item"]).default("order"),
  purpose: z.enum(["normal", "testkop"]).default("normal"),
  max_uses: z.number().int().positive().optional().nullable(),
  max_uses_per_user: z.number().int().positive().optional().nullable(),
  user_email: z.string().email().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data: codes, error } = await sb
      .from("promo_discount_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/discount-codes] list:", error);
      return NextResponse.json(
        { error: "Kunde inte hämta rabattkoder" },
        { status: 500 },
      );
    }

    const ids = (codes ?? []).map((c) => c.id);
    const useCounts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: uses, error: usesErr } = await sb
        .from("promo_discount_code_uses")
        .select("discount_code_id");
      if (usesErr) {
        console.error("[admin/discount-codes] uses count:", usesErr);
      } else {
        for (const u of uses ?? []) {
          const id = String(u.discount_code_id);
          useCounts.set(id, (useCounts.get(id) ?? 0) + 1);
        }
      }
    }

    const userIds = [
      ...new Set(
        (codes ?? [])
          .map((c) => c.user_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];
    const emailByUser = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        if (p.id && p.email) emailByUser.set(p.id, p.email);
      }
    }

    const enriched = (codes ?? []).map((c) => ({
      ...c,
      use_count: useCounts.get(c.id) ?? 0,
      user_email: c.user_id ? emailByUser.get(c.user_id) ?? null : null,
    }));

    return NextResponse.json({ codes: enriched });
  } catch (err) {
    console.error("[admin/discount-codes] GET:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ogiltig data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    if (body.type === "percent" && body.value > 100) {
      return NextResponse.json(
        { error: "Procentvärde får max vara 100." },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    let resolvedUserId: string | null = body.user_id ?? null;
    if (!resolvedUserId && body.user_email) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id")
        .eq("email", body.user_email.trim().toLowerCase())
        .maybeSingle();
      if (!profile?.id) {
        // try exact email match (case-sensitive fallback)
        const { data: profile2 } = await sb
          .from("profiles")
          .select("id")
          .ilike("email", body.user_email.trim())
          .maybeSingle();
        if (!profile2?.id) {
          return NextResponse.json(
            { error: "Ingen användare med den e-postadressen hittades." },
            { status: 400 },
          );
        }
        resolvedUserId = profile2.id;
      } else {
        resolvedUserId = profile.id;
      }
    }

    const insert = {
      code: body.code.trim().toUpperCase(),
      description: body.description?.trim() || null,
      type: body.type,
      value: body.value,
      applies_to: body.applies_to,
      purpose: body.purpose ?? "normal",
      max_uses: body.max_uses ?? null,
      max_uses_per_user: body.max_uses_per_user ?? null,
      user_id: resolvedUserId,
      valid_from: body.valid_from
        ? new Date(body.valid_from).toISOString()
        : new Date().toISOString(),
      valid_until: body.valid_until
        ? new Date(body.valid_until).toISOString()
        : null,
      active: body.active ?? true,
    };

    const { data, error } = await sb
      .from("promo_discount_codes")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/discount-codes] create:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "En kod med det namnet finns redan." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Kunde inte skapa rabattkod" },
        { status: 500 },
      );
    }

    return NextResponse.json({ code: data }, { status: 201 });
  } catch (err) {
    console.error("[admin/discount-codes] POST:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
