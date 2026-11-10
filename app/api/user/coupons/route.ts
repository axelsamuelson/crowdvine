import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type PromoRow = {
  id: string;
  code: string;
  type: string;
  value: number | string;
  description: string | null;
  valid_until: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
};

/**
 * GET /api/user/coupons
 *
 * Active, unused promo_discount_codes bound to the current user
 * (user_id, active, valid_until > now, not exhausted).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    const { data: rows, error } = await sb
      .from("promo_discount_codes")
      .select(
        "id, code, type, value, description, valid_until, max_uses, max_uses_per_user",
      )
      .eq("user_id", user.id)
      .eq("active", true)
      .gt("valid_until", nowIso)
      .order("valid_until", { ascending: true });

    if (error) {
      const code = String((error as { code?: string }).code || "");
      const msg = String((error as { message?: string }).message || "");
      // Preview/TEST may lack promo_discount_codes — degrade to empty list.
      if (
        code === "42P01" ||
        code === "PGRST205" ||
        /does not exist|schema cache|Could not find/i.test(msg)
      ) {
        console.warn("[api/user/coupons] table missing; returning []", {
          code,
          msg,
        });
        return NextResponse.json({ coupons: [] });
      }
      console.error("[api/user/coupons] lookup:", error);
      return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
    }

    const list = (rows ?? []) as PromoRow[];
    const coupons = [];

    for (const row of list) {
      if (row.max_uses != null) {
        const { count, error: countErr } = await sb
          .from("promo_discount_code_uses")
          .select("id", { count: "exact", head: true })
          .eq("discount_code_id", row.id);
        if (countErr) {
          console.error("[api/user/coupons] max_uses count:", countErr);
          continue;
        }
        if ((count ?? 0) >= row.max_uses) continue;
      }

      if (row.max_uses_per_user != null) {
        const { count, error: countErr } = await sb
          .from("promo_discount_code_uses")
          .select("id", { count: "exact", head: true })
          .eq("discount_code_id", row.id)
          .eq("user_id", user.id);
        if (countErr) {
          console.error("[api/user/coupons] per_user count:", countErr);
          continue;
        }
        if ((count ?? 0) >= row.max_uses_per_user) continue;
      }

      const valueNum = Number(row.value) || 0;
      const value_sek = row.type === "sek" ? valueNum : valueNum;

      coupons.push({
        id: row.id,
        code: String(row.code).toUpperCase(),
        value_sek,
        valid_until: row.valid_until,
        description: row.description,
      });
    }

    return NextResponse.json({ coupons });
  } catch (e) {
    console.error("[api/user/coupons] unexpected:", e);
    return NextResponse.json({ error: "Failed to load coupons" }, { status: 500 });
  }
}
