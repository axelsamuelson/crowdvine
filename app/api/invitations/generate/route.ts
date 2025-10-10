import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { expiresInDays = 30 } = await request.json();

    // Create Supabase client for user authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value),
            );
          },
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Use admin client for membership queries (to bypass RLS)
    let adminClient;
    try {
      adminClient = getSupabaseAdmin();
      console.log("[INVITE-GEN] Admin client created successfully");
    } catch (adminError) {
      console.error("[INVITE-GEN] Failed to create admin client:", adminError);
      return NextResponse.json(
        { error: "Server configuration error - admin client failed" },
        { status: 500 },
      );
    }
    
    // Check user has membership and is not a requester
    console.log("[INVITE-GEN] Fetching membership for user:", user.id);
    const { data: membership, error: membershipError } = await adminClient
      .from("user_memberships")
      .select("level, invite_quota_monthly, invites_used_this_month")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      console.error("[INVITE-GEN] Membership error:", {
        error: membershipError,
        code: membershipError?.code,
        message: membershipError?.message,
        details: membershipError?.details,
        hint: membershipError?.hint,
        userId: user.id
      });
      return NextResponse.json(
        { 
          error: "Membership not found",
          details: membershipError?.message || "No membership record"
        },
        { status: 403 },
      );
    }

    console.log("[INVITE-GEN] Membership found:", {
      level: membership.level,
      quota: membership.invite_quota_monthly,
      used: membership.invites_used_this_month
    });

    if (membership.level === 'requester') {
      return NextResponse.json(
        { error: "Requesters cannot generate invitations" },
        { status: 403 },
      );
    }

    // Check if user has available invites
    const availableInvites = membership.invite_quota_monthly - membership.invites_used_this_month;
    if (availableInvites <= 0) {
      return NextResponse.json(
        { error: "No invites remaining this month" },
        { status: 403 },
      );
    }

    // Generate invitation code
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation using admin client
    // Non-admin users can ONLY create 'basic' level invitations
    console.log("[INVITE-GEN] Creating invitation:", {
      code,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
      initial_level: 'basic'
    });

    const { data, error } = await adminClient
      .from("invitation_codes")
      .insert({
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        is_active: true,
        initial_level: 'basic', // Non-admins always create Basic invites
      })
      .select()
      .single();

    if (error) {
      console.error("[INVITE-GEN] Error creating invitation:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      });
      return NextResponse.json(
        { 
          error: "Failed to create invitation",
          details: error?.message || "Database error",
          code: error?.code
        },
        { status: 500 },
      );
    }

    console.log("[INVITE-GEN] Invitation created successfully:", data.id);

    // Increment invites_used_this_month using admin client
    console.log("[INVITE-GEN] Incrementing quota usage");
    const { error: quotaError } = await adminClient
      .from("user_memberships")
      .update({
        invites_used_this_month: membership.invites_used_this_month + 1,
        // updated_at will be handled by trigger if it exists
      })
      .eq("user_id", user.id);

    if (quotaError) {
      console.error("[INVITE-GEN] Failed to update quota:", quotaError);
      // Don't fail the request, invitation was already created
    } else {
      console.log("[INVITE-GEN] Quota updated successfully");
    }

    // Generate signup URLs with shorter, more robust structure
    // IMPORTANT: Always trim baseUrl to prevent accidental spaces in environment variable
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim();

    // Create shorter URLs that are less likely to be broken by Instagram
    // Use shorter path structure: /i/{code} instead of /invite-signup?invite={code}
    const signupUrl = `${baseUrl}/i/${code}`;
    const codeSignupUrl = `${baseUrl}/c/${code}`;
    
    console.log("[INVITE-GEN] Generated URLs:", {
      baseUrl,
      signupUrl,
      hasSpace: signupUrl.includes(' '),
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: data.id,
        code,
        signupUrl,
        codeSignupUrl,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
        initialLevel: data.initial_level, // Always 'basic' for non-admins
      },
    });
  } catch (error) {
    console.error("Generate invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  // Shorter code (12 characters) to make URLs more compact
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
