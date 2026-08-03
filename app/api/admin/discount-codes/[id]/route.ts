import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const patchSchema = z.object({
  code: z.string().min(1).max(64).optional(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(["percent", "sek"]).optional(),
  value: z.number().positive().optional(),
  applies_to: z.enum(["order", "item"]).optional(),
  purpose: z.enum(["normal", "testkop"]).optional(),
  max_uses: z.number().int().positive().optional().nullable(),
  max_uses_per_user: z.number().int().positive().optional().nullable(),
  user_email: z.string().email().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  clear_user: z.boolean().optional(),
  valid_from: z.string().optional().nullable(),
  valid_until: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const sb = getSupabaseAdmin();

    const { data: uses, error } = await sb
      .from("promo_discount_code_uses")
      .select("id, user_id, reservation_id, discount_amount_sek, created_at")
      .eq("discount_code_id", id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/discount-codes/uses]", error);
      return NextResponse.json(
        { error: "Kunde inte hämta användning" },
        { status: 500 },
      );
    }

    const userIds = [
      ...new Set(
        (uses ?? [])
          .map((u) => u.user_id)
          .filter((uid): uid is string => typeof uid === "string"),
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

    return NextResponse.json({
      uses: (uses ?? []).map((u) => ({
        ...u,
        user_email: emailByUser.get(u.user_id) ?? null,
      })),
    });
  } catch (err) {
    console.error("[admin/discount-codes/[id]] GET:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const raw = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Ogiltig data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const body = parsed.data;
    const type = body.type;
    const value = body.value;
    if (type === "percent" && value != null && value > 100) {
      return NextResponse.json(
        { error: "Procentvärde får max vara 100." },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const update: Record<string, unknown> = {};

    if (body.code != null) update.code = body.code.trim().toUpperCase();
    if (body.description !== undefined) {
      update.description = body.description?.trim() || null;
    }
    if (body.type != null) update.type = body.type;
    if (body.value != null) update.value = body.value;
    if (body.applies_to != null) update.applies_to = body.applies_to;
    if (body.purpose != null) update.purpose = body.purpose;
    if (body.max_uses !== undefined) update.max_uses = body.max_uses;
    if (body.max_uses_per_user !== undefined) {
      update.max_uses_per_user = body.max_uses_per_user;
    }
    if (body.valid_from !== undefined) {
      update.valid_from = body.valid_from
        ? new Date(body.valid_from).toISOString()
        : null;
    }
    if (body.valid_until !== undefined) {
      update.valid_until = body.valid_until
        ? new Date(body.valid_until).toISOString()
        : null;
    }
    if (body.active !== undefined) update.active = body.active;

    if (body.clear_user) {
      update.user_id = null;
    } else if (body.user_id) {
      update.user_id = body.user_id;
    } else if (body.user_email) {
      const { data: profile } = await sb
        .from("profiles")
        .select("id")
        .ilike("email", body.user_email.trim())
        .maybeSingle();
      if (!profile?.id) {
        return NextResponse.json(
          { error: "Ingen användare med den e-postadressen hittades." },
          { status: 400 },
        );
      }
      update.user_id = profile.id;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Inga ändringar" }, { status: 400 });
    }

    const { data, error } = await sb
      .from("promo_discount_codes")
      .update(update)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[admin/discount-codes] patch:", error);
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "En kod med det namnet finns redan." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Kunde inte uppdatera rabattkod" },
        { status: 500 },
      );
    }

    return NextResponse.json({ code: data });
  } catch (err) {
    console.error("[admin/discount-codes/[id]] PATCH:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
