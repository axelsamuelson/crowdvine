import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const B2C = "user";
const B2B = "business";

/**
 * GET /api/me/portal
 * Returns which portals the user can access (B2C = pactwines.com, B2B = dirtywine.se).
 * - canAccessB2C: can use pactwines.com (User)
 * - canAccessB2B: can use dirtywine.se (Business)
 * - showPortalToggle: has both → show B2C/B2B switch
 * - isB2BOnly: only Business → no toggle, only dirtywine.se
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        canAccessB2C: false,
        canAccessB2B: false,
        showPortalToggle: false,
        isB2BOnly: false,
      });
    }

    const sb = getSupabaseAdmin();
    let access: string[] = ["user"];
    try {
      const { data: profile } = await sb
        .from("profiles")
        .select("portal_access")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.portal_access && Array.isArray(profile.portal_access))
        access = profile.portal_access;
    } catch {
      // Column portal_access may not exist yet (migration 066 not run)
    }
    const canAccessB2C = access.includes(B2C);
    const canAccessB2B = access.includes(B2B);
    const showPortalToggle = canAccessB2C && canAccessB2B;
    const isB2BOnly = canAccessB2B && !canAccessB2C;

    return NextResponse.json({
      canAccessB2C,
      canAccessB2B,
      showPortalToggle,
      isB2BOnly,
    });
  } catch (error) {
    console.error("Error fetching portal access:", error);
    return NextResponse.json(
      {
        canAccessB2C: false,
        canAccessB2B: false,
        showPortalToggle: false,
        isB2BOnly: false,
      },
      { status: 200 },
    );
  }
}
