import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    console.log('Debug access requests: Starting');
    
    const adminSupabase = getSupabaseAdmin();
    
    // Check if access_requests table exists and has data
    const { data: accessRequests, error } = await adminSupabase
      .from('access_requests')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json({ 
        error: "Database error", 
        details: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Access requests found:', accessRequests?.length || 0);

    return NextResponse.json({
      success: true,
      count: accessRequests?.length || 0,
      requests: accessRequests || [],
      message: 'Access requests fetched successfully'
    });

  } catch (error) {
    console.error('Debug access requests error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
