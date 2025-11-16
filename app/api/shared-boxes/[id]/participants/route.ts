import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteeIds } = await request.json();
    if (!Array.isArray(inviteeIds) || inviteeIds.length === 0) {
      return NextResponse.json(
        { error: "No invitees provided" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const rows = inviteeIds.map((inviteeId: string) => ({
      shared_box_id: params.id,
      user_id: inviteeId,
      role: "member",
      invite_status: "pending",
    }));

    const { error } = await sb
      .from("shared_box_participants")
      .insert(rows, { defaultToNull: false });

    if (error && error.code !== "23505") {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Add participant error:", error);
    return NextResponse.json(
      { error: "Failed to add participant" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteStatus } = await request.json();
    if (!inviteStatus) {
      return NextResponse.json(
        { error: "Missing invite status" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    await sb
      .from("shared_box_participants")
      .update({ invite_status: inviteStatus })
      .eq("shared_box_id", params.id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Participant update error:", error);
    return NextResponse.json(
      { error: "Failed to update participant" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") ?? user.id;

    const sb = getSupabaseAdmin();
    await sb
      .from("shared_box_participants")
      .delete()
      .eq("shared_box_id", params.id)
      .eq("user_id", userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Participant delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove participant" },
      { status: 500 },
    );
  }
}

