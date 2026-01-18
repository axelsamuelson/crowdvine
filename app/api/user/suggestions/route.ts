import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * GET /api/user/suggestions
 * Returns a small list of other users on the platform (excluding current user)
 * - Never includes users the current user already follows
 * - Shuffles results so the list changes over time
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Fetch a bigger pool and shuffle, then filter out already-followed.
    const { data: users, error } = await sb
      .from("profiles")
      .select("id, full_name, avatar_image_path, description")
      .neq("id", user.id)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    const pool = Array.isArray(users) ? users : [];
    const ids = pool.map((u) => u.id);

    // Which of these does the current user already follow?
    let followingIds: string[] = [];
    if (ids.length > 0) {
      const { data: followingRows, error: followErr } = await sb
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id)
        .in("following_id", ids);

      if (followErr?.code === "PGRST205") {
        // Followers table missing; return shuffled pool without follow flag.
        return NextResponse.json({ users: shuffleInPlace(pool).slice(0, 6) });
      }

      if (!followErr && followingRows) {
        followingIds = followingRows.map((r) => r.following_id);
      }
    }

    const notFollowing = pool
      .filter((u) => !followingIds.includes(u.id))
      .map((u) => ({ ...u, isFollowing: false }));

    shuffleInPlace(notFollowing);

    return NextResponse.json({ users: notFollowing.slice(0, 6) });
  } catch (error) {
    console.error("Error fetching user suggestions:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggestions" },
      { status: 500 },
    );
  }
}
