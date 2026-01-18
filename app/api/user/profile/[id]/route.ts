import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetId = params.id;
    if (!targetId) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    const { data, error } = await sb
      .from("profiles")
      .select("id, full_name, avatar_image_path, description, created_at")
      .eq("id", targetId)
      .single();

    if (error) throw error;

    return NextResponse.json({ profile: data });
  } catch (error) {
    console.error("Error fetching profile by id:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}



