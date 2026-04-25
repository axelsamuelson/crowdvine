import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type DiscountCodeRow = {
  id: string;
  code: string;
  discount_percentage: number | null;
  discount_amount_cents: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  current_usage: number | null;
};

/**
 * GET /api/user/vouchers
 *
 * Active, unused milestone discount codes for the current user.
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
      .from("discount_codes")
      .select(
        "id, code, discount_percentage, discount_amount_cents, expires_at, usage_limit, current_usage",
      )
      .eq("earned_by_user_id", user.id)
      .eq("voucher_type", "milestone")
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

    if (error) {
      console.error("Error fetching milestone vouchers:", error);
      return NextResponse.json({ vouchers: [] });
    }

    const list = (rows ?? []) as DiscountCodeRow[];
    const filtered = list.filter((r) => {
      const limit = r.usage_limit;
      const usage = r.current_usage ?? 0;
      return limit == null || usage < limit;
    });

    const vouchers = filtered.map((r) => {
      const limit = r.usage_limit;
      const usage = r.current_usage ?? 0;
      const used = limit != null && usage >= limit;
      return {
        id: r.id,
        code: r.code,
        discount_percentage: r.discount_percentage,
        discount_amount_cents: r.discount_amount_cents,
        expires_at: r.expires_at,
        used,
      };
    });

    return NextResponse.json({ vouchers });
  } catch (e) {
    console.error("Error in GET /api/user/vouchers:", e);
    return NextResponse.json({ vouchers: [] });
  }
}
