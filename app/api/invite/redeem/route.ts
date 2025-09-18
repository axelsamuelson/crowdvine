import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    if (!email || !password || !code) {
      return NextResponse.json({ error: "Email, password, and code are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Validate invitation code against database
    const { data: invitationCode, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (codeError || !invitationCode) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 400 });
    }

    // Check if code is expired
    if (new Date(invitationCode.expires_at) < new Date()) {
      return NextResponse.json({ error: "Invitation code has expired" }, { status: 400 });
    }

    // Check if code is already used
    if (invitationCode.used_at) {
      return NextResponse.json({ error: "Invitation code has already been used" }, { status: 400 });
    }

    // Check if code is for specific email (if specified)
    if (invitationCode.email && invitationCode.email !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "This invitation code is not valid for this email address" }, { status: 400 });
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

      // Mark invitation code as used
      const { error: updateCodeError } = await supabase
        .from('invitation_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
          is_active: false
        })
        .eq('id', invitationCode.id);

      if (updateCodeError) {
        console.error('Error updating invitation code:', updateCodeError);
        // Don't fail the request, just log the error
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