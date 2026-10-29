import { NextRequest, NextResponse } from "next/server";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isUnauthorizedResponse, requireAdminOr401 } from "@/lib/admin-auth-http";

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;
    const { id, status, initialLevel } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: "ID and status are required" },
        { status: 400 },
      );
    }

    // Validate initial_level if provided
    if (initialLevel) {
      const validLevels = ["basic", "brons", "silver", "guld", "privilege"];
      if (!validLevels.includes(initialLevel)) {
        return NextResponse.json(
          {
            error:
              "Invalid initial level. Must be: basic, brons, silver, guld, or privilege",
          },
          { status: 400 },
        );
      }
    }

    const supabase = getSupabaseAdmin();

    const now = new Date().toISOString();
    // Update status and always stamp reviewed_at on approve/reject.
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
      reviewed_at: now,
    };

    // Only set initial_level if provided (for approved requests)
    if (initialLevel) {
      updateData.initial_level = initialLevel;
    }

    const { data, error } = await supabase
      .from("access_requests")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating access request:", error);
      return NextResponse.json(
        { error: "Failed to update access request" },
        { status: 500 },
      );
    }

    if (status === "approved" || status === "rejected" || status === "denied") {
      void logUserEventServer({
        userId: adminAuth.id ?? null,
        eventType: status === "approved" ? "access_approved" : "access_denied",
        eventCategory: "auth",
        metadata: {
          access_request_id: id,
          status,
          // Never store requester email/name in analytics.
          has_initial_level: Boolean(initialLevel),
        },
        internal: true,
      });
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
