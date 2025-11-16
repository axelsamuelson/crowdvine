import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (search) {
      const { data: results, error } = await sb
        .from("profiles")
        .select("id, full_name, email")
        .ilike("full_name", `%${search}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) throw error;
      return NextResponse.json({ results });
    }

    const [{ data: followers }, { data: following }] = await Promise.all([
      sb
        .from("user_follows")
        .select(
          `
          follower_id,
          profiles:follower_id ( id, full_name, email )
        `,
        )
        .eq("followed_id", user.id),
      sb
        .from("user_follows")
        .select(
          `
          followed_id,
          profiles:followed_id ( id, full_name, email )
        `,
        )
        .eq("follower_id", user.id),
    ]);

    return NextResponse.json({
      followers: followers?.map((row) => row.profiles) ?? [],
      following: following?.map((row) => row.profiles) ?? [],
    });
  } catch (error) {
    console.error("Follow GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetUserId } = await request.json();
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing targetUserId" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const { error } = await sb.from("user_follows").insert({
      follower_id: user.id,
      followed_id: targetUserId,
    });

    if (error && error.code !== "23505") {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Follow POST error:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("target");
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing target param" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    await sb
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("followed_id", targetUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Follow DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to unfollow" },
      { status: 500 },
    );
  }
}

