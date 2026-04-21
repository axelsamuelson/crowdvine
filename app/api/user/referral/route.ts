import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAppUrl } from "@/lib/app-url";
import { ensurePersonalInviteForUser } from "@/lib/referral/ensure-personal-invite";

/**
 * GET /api/user/referral
 *
 * Ensures personal_invite_code + master invitation row, returns share URL and referral stats.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { code } = await ensurePersonalInviteForUser(sb, user.id);

    const { count: invited, error: invErr } = await sb
      .from("referral_signups")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", user.id);

    if (invErr) throw invErr;

    const { count: activated, error: actErr } = await sb
      .from("referral_signups")
      .select("*", { count: "exact", head: true })
      .eq("inviter_id", user.id)
      .not("referral_activated_at", "is", null);

    if (actErr) throw actErr;

    const base = getAppUrl().replace(/\/$/, "");
    const inviteUrl = `${base}/i/${code}`;

    return NextResponse.json({
      code,
      inviteUrl,
      invitedCount: invited ?? 0,
      activatedCount: activated ?? 0,
    });
  } catch (e) {
    console.error("[GET /api/user/referral]", e);
    return NextResponse.json(
      { error: "Failed to load referral link" },
      { status: 500 },
    );
  }
}
