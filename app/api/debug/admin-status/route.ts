import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: "Not authenticated",
        authError: authError?.message 
      });
    }

    // Check user access in both tables
    const { data: userAccess } = await supabase
      .from('user_access')
      .select('role, email, access_granted_at')
      .eq('user_id', user.id)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email, access_granted_at')
      .eq('id', user.id)
      .single();

    const isAdmin = userAccess?.role === 'admin' || profile?.role === 'admin';

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      userAccess,
      profile,
      isAdmin,
      adminRole: userAccess?.role || profile?.role
    });

  } catch (error) {
    console.error('Admin debug API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
