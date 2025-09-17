import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const supabase = await supabaseServer();
    const adminSupabase = getSupabaseAdmin();

    // Check if user has approved access request
    const { data: accessRequest, error: accessError } = await adminSupabase
      .from('access_requests')
      .select('status')
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'approved')
      .single();

    if (accessError || !accessRequest) {
      return NextResponse.json({ 
        success: false, 
        message: 'No approved access request found for this email' 
      });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    // Grant access to the user
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email.toLowerCase().trim(),
        access_granted_at: new Date().toISOString(),
        role: 'user'
      });

    if (profileError) {
      console.error('Error granting access to user:', profileError);
      return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Access granted successfully!" 
    });

  } catch (error) {
    console.error('Grant access API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
