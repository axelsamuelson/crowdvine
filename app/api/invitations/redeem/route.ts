import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();
    
    if (!email || !password || !code) {
      return NextResponse.json({ error: "Email, password, and invitation code are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Validate invitation code first
    const { data: invitation, error: invitationError } = await supabase
      .from('invitation_codes')
      .select('id, code, expires_at, max_uses, current_uses, is_active')
      .eq('code', code)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: "Invalid invitation code" }, { status: 400 });
    }

    // Check if invitation is still valid
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (!invitation.is_active) {
      return NextResponse.json({ error: "Invitation code is no longer active" }, { status: 400 });
    }

    if (expiresAt < now) {
      return NextResponse.json({ error: "Invitation code has expired" }, { status: 400 });
    }

    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      return NextResponse.json({ error: "Invitation code has been used up" }, { status: 400 });
    }

    // Create user account
    console.log('Creating user with email:', email.toLowerCase().trim());
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true // Skip email confirmation for invitation signups
    });

    if (authError || !authData.user) {
      console.error('Create user error:', authError);
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    console.log('User created successfully with ID:', authData.user.id);
    
    // Check if profile already exists (in case of duplicate key error)
    console.log('Checking if profile already exists...');
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (profileCheckError && profileCheckError.code !== 'PGRST116') {
      console.error('Profile check error:', profileCheckError);
    } else if (existingProfile) {
      console.log('Profile already exists, skipping creation');
      // Profile already exists, just update the invitation usage
      const { error: updateError } = await supabase
        .from('invitation_codes')
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
          current_uses: invitation.current_uses + 1
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Update invitation error:', updateError);
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        message: "Account created successfully. Please sign in with your credentials."
      });
    }

    // Create profile with access granted
    console.log('Creating profile for user ID:', authData.user.id);
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        access_granted_at: new Date().toISOString(),
        invite_code_used: code
      });

    if (profileError) {
      console.error('Create profile error:', profileError);
      console.error('Profile error details:', JSON.stringify(profileError, null, 2));
      
      // Clean up the created user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json({ 
        error: "Failed to create profile", 
        details: profileError.message,
        code: profileError.code 
      }, { status: 500 });
    }

    // Update invitation usage
    const { error: updateError } = await supabase
      .from('invitation_codes')
      .update({
        used_at: new Date().toISOString(),
        used_by: authData.user.id,
        current_uses: invitation.current_uses + 1
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Update invitation error:', updateError);
      // Don't fail the signup if we can't update the invitation
    }

    // Return success - frontend will handle sign in
    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      },
      message: "Account created successfully. Please sign in with your credentials."
    });

  } catch (error) {
    console.error('Redeem invitation error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
