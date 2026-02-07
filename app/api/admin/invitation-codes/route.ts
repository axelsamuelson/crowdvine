import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Fetch invitation codes
    const { data: invitationCodes, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching invitation codes:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitation codes" },
        { status: 500 },
      );
    }

    return NextResponse.json(invitationCodes || []);
  } catch (error) {
    console.error("Invitation codes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      expiryDays = 30,
      allowedTypes = ["consumer"],
      canChangeAccountType = false,
      initialLevel = "basic",
    } = body;

    const validTypes = ["consumer", "producer", "business"];
    const types = Array.isArray(allowedTypes)
      ? allowedTypes.filter((t: string) => validTypes.includes(t))
      : ["consumer"];
    const allowedTypesArr = types.length > 0 ? types : ["consumer"];
    const invitationType = allowedTypesArr[0];

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();
    const { data: profile } = await sb
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Generate invitation code (try RPC first, fallback to JS)
    let code: string;
    const { data: rpcCode, error: codeError } = await sb.rpc(
      "generate_invitation_code",
    );

    if (codeError || !rpcCode) {
      console.warn("RPC generate_invitation_code failed, using fallback:", codeError?.message);
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      code = "";
      for (let i = 0; i < 12; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } else {
      code = typeof rpcCode === "string" ? rpcCode : String(rpcCode);
    }

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiryDays || 30));

    // Validate initial level
    const validLevels = ["basic", "brons", "silver", "guld", "privilege"];
    const level = validLevels.includes(initialLevel) ? initialLevel : "basic";

    // Create invitation code (use admin client to bypass RLS)
    // Note: invitation_codes table may not have email column depending on migration
    const insertData: Record<string, unknown> = {
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        is_active: true,
        invitation_type: invitationType,
        allowed_types: allowedTypesArr,
        can_change_account_type: !!canChangeAccountType,
        initial_level: level,
    };
    const { data, error } = await sb
      .from("invitation_codes")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation code:", error);
      return NextResponse.json(
        {
          error: "Failed to create invitation code",
          details: error.message,
          code: error.code,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Create invitation code API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
