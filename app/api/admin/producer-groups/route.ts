import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const { data: groups, error } = await sb
      .from("producer_groups")
      .select(`
        id,
        name,
        description,
        created_at,
        producer_group_members(
          id,
          producer_id,
          producers(
            id,
            name,
            region
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching producer groups:", error);
      return NextResponse.json(
        { error: "Failed to fetch producer groups" },
        { status: 500 }
      );
    }

    // Rename producer_group_members to members for cleaner API
    const groupsWithMembers = groups?.map(group => ({
      ...group,
      members: group.producer_group_members,
      producer_group_members: undefined,
    }));

    return NextResponse.json({
      groups: groupsWithMembers || [],
    });
  } catch (error) {
    console.error("Error in producer groups API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    const { data: group, error } = await sb
      .from("producer_groups")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating producer group:", error);
      return NextResponse.json(
        { error: "Failed to create producer group" },
        { status: 500 }
      );
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error in producer groups API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

