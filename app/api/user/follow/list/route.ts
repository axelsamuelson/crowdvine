import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ListType = "followers" | "following";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = (url.searchParams.get("userId") || "").trim();
    const type = (url.searchParams.get("type") || "followers") as ListType;
    const limitRaw = Number(url.searchParams.get("limit") || "50");
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(200, Math.floor(limitRaw)))
      : 50;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    if (type !== "followers" && type !== "following") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const sb = await supabaseServer();

    const { data: rows, error: rowsErr } = await sb
      .from("followers")
      .select("follower_id, following_id, created_at")
      .eq(type === "followers" ? "following_id" : "follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rowsErr) throw rowsErr;

    const ids = Array.from(
      new Set(
        (rows || []).map((r: any) =>
          type === "followers" ? r.follower_id : r.following_id,
        ),
      ),
    );

    if (ids.length === 0) {
      return NextResponse.json({ users: [] });
    }

    const { data: profiles, error: profErr } = await sb
      .from("profiles")
      .select("id, full_name, avatar_image_path, description")
      .in("id", ids);

    if (profErr) throw profErr;

    const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    return NextResponse.json({ users: ordered });
  } catch (error) {
    console.error("Error fetching follow list:", error);
    return NextResponse.json({ error: "Failed to fetch list" }, { status: 500 });
  }
}


