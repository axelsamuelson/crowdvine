import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Get all profiles to see the structure
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      profiles: profiles || [],
      count: profiles?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug profiles API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
