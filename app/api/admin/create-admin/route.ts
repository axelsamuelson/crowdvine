import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create admin user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true // Skip email confirmation
    });

    if (authError || !authData.user) {
      console.error('Error creating admin user:', authError);
      return NextResponse.json({ error: "Failed to create admin user" }, { status: 500 });
    }

    // Create profile with admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        role: 'admin',
        access_granted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating admin profile:', profileError);
      return NextResponse.json({ error: "Failed to create admin profile" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Create admin user error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
