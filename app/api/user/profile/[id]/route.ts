import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetId } = await params;
    if (!targetId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    let sb;
    try {
      sb = getSupabaseAdmin();
    } catch (error) {
      console.warn(
        "[PROFILE] Supabase admin unavailable, falling back to server client",
      );
      sb = await supabaseServer();
    }

    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, avatar_image_path, description, created_at")
      .eq("id", targetId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Error fetching profile by id:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}



