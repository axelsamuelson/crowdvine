import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create admin profile
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: crypto.randomUUID(),
        email: email.toLowerCase().trim(),
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin profile:', error);
      return NextResponse.json({ error: "Failed to create admin profile" }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: data });

  } catch (error) {
    console.error('Create admin profile error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
