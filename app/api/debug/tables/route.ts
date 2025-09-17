import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    // Get all user_access
    const { data: userAccess, error: userAccessError } = await supabase
      .from('user_access')
      .select('*');
    
    return NextResponse.json({
      success: true,
      profiles: {
        data: profiles || [],
        count: profiles?.length || 0,
        error: profilesError?.message || null
      },
      userAccess: {
        data: userAccess || [],
        count: userAccess?.length || 0,
        error: userAccessError?.message || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug tables API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
