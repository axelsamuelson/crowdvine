import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { id, status, initialLevel } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 },
      );
    }

    // Validate initial_level if provided
    if (initialLevel) {
      const validLevels = ['basic', 'brons', 'silver', 'guld'];
      if (!validLevels.includes(initialLevel)) {
        return NextResponse.json(
          { error: "Invalid initial level. Must be: basic, brons, silver, or guld" },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseAdmin();

    // Update status and initial_level
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Only set initial_level if provided (for approved requests)
    // Try to update with initial_level, fall back without it if column doesn't exist
    if (initialLevel) {
      updateData.initial_level = initialLevel;
    }

    let data, error;
    try {
      const result = await supabase
        .from("access_requests")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } catch (err: any) {
      // If initial_level column doesn't exist, try without it
      if (err?.message?.includes('initial_level') || (initialLevel && err)) {
        console.log("DEBUG: initial_level column not found, updating without it...");
        const fallbackData: any = {
          status,
          updated_at: new Date().toISOString(),
        };
        const result = await supabase
          .from("access_requests")
          .update(fallbackData)
          .eq("id", id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        throw err;
      }
    }

    if (error) {
      console.error("Error updating access request:", error);
      return NextResponse.json(
        { error: "Failed to update access request" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      message: `Access request ${status} successfully`,
    });
  } catch (error) {
    console.error("Update access request API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
