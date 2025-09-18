import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find user by email
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Grant access by updating profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: email.toLowerCase().trim(),
        access_granted_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error granting access:', profileError);
      return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
    }

    // Update user_access table if it exists
    const { error: userAccessError } = await supabase
      .from('user_access')
      .upsert({
        user_id: authUser.user.id,
        email: email.toLowerCase().trim(),
        access_granted_at: new Date().toISOString(),
        status: 'active',
        granted_by: 'admin'
      });

    if (userAccessError) {
      console.log('user_access table update failed (may not exist):', userAccessError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: "Access granted successfully" 
    });

  } catch (error) {
    console.error('Grant access API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}