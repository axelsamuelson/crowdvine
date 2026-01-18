import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/follow/stats?userId=:id
 * - followers: how many follow this userId
 * - following: how many this userId follows
 * - isFollowing: whether current user follows userId (when userId != current)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const targetId = url.searchParams.get("userId") || user.id;
    const sb = getSupabaseAdmin();

    // Followers count (who follows target)
    const { count: followersCount, error: followersErr } = await sb
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", targetId);
    if (followersErr) throw followersErr;

    // Following count (who target is following)
    const { count: followingCount, error: followingErr } = await sb
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", targetId);
    if (followingErr) throw followingErr;

    let isFollowing: boolean | undefined = undefined;
    if (targetId !== user.id) {
      const { count: isFollowCount, error: isFollowErr } = await sb
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
      if (isFollowErr) throw isFollowErr;
      isFollowing = (isFollowCount || 0) > 0;
    }

    return NextResponse.json({
      followers: followersCount || 0,
      following: followingCount || 0,
      isFollowing,
    });
  } catch (error: any) {
    if (error?.code === "PGRST205") {
      console.error("Followers table missing. Run migration 051_create_followers_table.sql");
      return NextResponse.json(
        {
          error: "Followers table missing. Run migration 051_create_followers_table.sql",
          code: "TABLE_MISSING",
        },
        { status: 500 },
      );
    }
    console.error("Error fetching follow stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow stats" },
      { status: 500 },
    );
  }
}



