import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    if (!email || !password || !code) {
      return NextResponse.json({ error: "Email, password, and code are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // For now, we'll implement a simple invitation code system
    // In a real implementation, you'd have an invitation_codes table
    // For testing, we'll accept any 20-character code
    
    if (code.length !== 20) {
      return NextResponse.json({ error: "Invalid invitation code format" }, { status: 400 });
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true // Skip email confirmation
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    if (authData.user) {
      // Grant access immediately
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          access_granted_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error granting access:', profileError);
        return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Account created and access granted successfully",
        user: {
          id: authData.user.id,
          email: authData.user.email
        }
      });
    }

    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });

  } catch (error) {
    console.error('Invite redeem API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}