import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || code.length !== 20 || !/^\d{20}$/.test(code)) {
      return NextResponse.json(
        { error: "Please provide a valid 20-digit invitation code" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();

    // Validate invitation code using the database function
    const { data: isValid, error: validationError } = await supabase.rpc(
      "validate_invitation_code",
      { code_input: code },
    );

    if (validationError) {
      console.error("Error validating invitation code:", validationError);
      return NextResponse.json(
        { error: "Failed to validate invitation code" },
        { status: 500 },
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired invitation code" },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Use the invitation code
    const { data: success, error: useError } = await supabase.rpc(
      "use_invitation_code",
      {
        code_input: code,
        user_email: user.email,
      },
    );

    if (useError) {
      console.error("Error using invitation code:", useError);
      return NextResponse.json(
        { error: "Failed to use invitation code" },
        { status: 500 },
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Invitation code could not be used" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Platform access granted successfully",
    });
  } catch (error) {
    console.error("Invitation code validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
