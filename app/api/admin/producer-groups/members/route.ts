import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { groupId, producerId } = await request.json();

    if (!groupId || !producerId) {
      return NextResponse.json(
        { error: "Group ID and Producer ID are required" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    // Check if producer is already in this group
    const { data: existing } = await sb
      .from("producer_group_members")
      .select("id")
      .eq("group_id", groupId)
      .eq("producer_id", producerId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "Producer is already in this group" },
        { status: 400 }
      );
    }

    // Add producer to group
    const { data: member, error } = await sb
      .from("producer_group_members")
      .insert({
        group_id: groupId,
        producer_id: producerId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding producer to group:", error);
      return NextResponse.json(
        { error: "Failed to add producer to group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Error in add producer to group API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

