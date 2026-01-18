import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * POST /api/user/follow
 * Body: { targetId: string, action: "follow" | "unfollow" }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const targetId = body.targetId as string;
    const action = body.action as "follow" | "unfollow";

    if (!targetId || !["follow", "unfollow"].includes(action)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    if (targetId === user.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    if (action === "follow") {
      const { error } = await sb
        .from("followers")
        .upsert({ follower_id: user.id, following_id: targetId });
      if (error) throw error;
      return NextResponse.json({ ok: true, following: true });
    }

    // unfollow
    const { error } = await sb
      .from("followers")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    if (error) throw error;
    return NextResponse.json({ ok: true, following: false });
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

    console.error("Error follow/unfollow:", error);
    return NextResponse.json(
      { error: "Failed to update follow status" },
      { status: 500 },
    );
  }
}

