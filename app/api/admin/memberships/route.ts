import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  isUnauthorizedResponse,
  requireAdminOr401,
} from "@/lib/admin-auth-http";

/**
 * GET /api/admin/memberships
 *
 * Get all user memberships (admin only)
 */
export async function GET(request: Request) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;

    const sb = getSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get all memberships with user profile info
    const {
      data: memberships,
      error,
      count,
    } = await sb
      .from("user_memberships")
      .select("*, profiles!user_id(email, full_name)", { count: "exact" })
      .order("impact_points", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return NextResponse.json({
      memberships: memberships || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return NextResponse.json(
      { error: "Failed to fetch memberships" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/memberships
 *
 * Update user membership (admin only)
 */
export async function PUT(request: Request) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;

    const sb = getSupabaseAdmin();

    const body = await request.json();
    const { userId, level, impactPoints } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (level) {
      updates.level = level;
      updates.level_assigned_at = new Date().toISOString();

      // Update invite quota based on new level
      const { data: quotaData } = await sb.rpc("get_invite_quota_for_level", {
        lvl: level,
      });
      if (quotaData) {
        updates.invite_quota_monthly = quotaData;
      }
    }

    if (typeof impactPoints === "number") {
      updates.impact_points = impactPoints;
    }

    // Update membership
    const { data, error } = await sb
      .from("user_memberships")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ membership: data });
  } catch (error) {
    console.error("Error updating membership:", error);
    return NextResponse.json(
      { error: "Failed to update membership" },
      { status: 500 },
    );
  }
}
