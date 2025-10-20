import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

// GET: Check if user has seen onboarding
export async function GET(req: NextRequest) {
  try {
    console.log("🎓 [API] GET /api/user/onboarding-seen called");

    const user = await getCurrentUser();

    if (!user) {
      console.log("🎓 [API] No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🎓 [API] User authenticated:", user.id);

    const supabase = getSupabaseAdmin();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("onboarding_seen")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("🎓 [API] Error fetching onboarding status:", error);
      console.error("🎓 [API] Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json(
        { error: "Failed to fetch onboarding status", details: error.message },
        { status: 500 },
      );
    }

    if (!profile) {
      console.log("🎓 [API] No profile found for user");
      // Profile doesn't exist yet, return false (should see onboarding)
      return NextResponse.json({
        onboardingSeen: false,
      });
    }

    console.log("🎓 [API] Profile onboarding_seen:", profile?.onboarding_seen);

    // Also check if user has membership, if not they need to see onboarding
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("🎓 [API] User membership:", membership);

    if (!membership) {
      console.log("🎓 [API] No membership found, user should see onboarding");
      // No membership yet, they should see onboarding
      return NextResponse.json({
        onboardingSeen: false,
      });
    }

    return NextResponse.json({
      onboardingSeen: profile?.onboarding_seen || false,
    });
  } catch (error: any) {
    console.error(
      "🎓 [API] CAUGHT ERROR in GET /api/user/onboarding-seen:",
      error,
    );
    console.error("🎓 [API] Error name:", error?.name);
    console.error("🎓 [API] Error message:", error?.message);
    console.error("🎓 [API] Error stack:", error?.stack);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error?.message || "Unknown error",
        name: error?.name || "Unknown",
      },
      { status: 500 },
    );
  }
}

// POST: Mark onboarding as seen
export async function POST(req: NextRequest) {
  try {
    console.log("🎓 [API] POST /api/user/onboarding-seen called");

    const user = await getCurrentUser();

    if (!user) {
      console.log("🎓 [API] POST: No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🎓 [API] POST: User authenticated:", user.id);

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_seen: true })
      .eq("id", user.id);

    if (error) {
      console.error("🎓 [API] POST: Error updating onboarding status:", error);
      console.error(
        "🎓 [API] POST: Error details:",
        JSON.stringify(error, null, 2),
      );
      return NextResponse.json(
        { error: "Failed to update onboarding status", details: error.message },
        { status: 500 },
      );
    }

    console.log(
      "🎓 [API] POST: Successfully marked onboarding as seen for user:",
      user.id,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "🎓 [API] POST: Error in POST /api/user/onboarding-seen:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
