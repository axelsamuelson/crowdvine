import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Test basic connection
    const { data, error } = await supabase
      .from('invitation_codes')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: 'Failed to connect to database'
      });
    }

    // Check if realtime is enabled
    const { data: realtimeStatus, error: realtimeError } = await supabase
      .rpc('get_realtime_status');

    return NextResponse.json({
      success: true,
      databaseConnection: 'OK',
      realtimeStatus: realtimeStatus || 'Unknown',
      realtimeError: realtimeError?.message || null,
      message: 'Database connection successful. Check Supabase dashboard for Realtime settings.'
    });

  } catch (error) {
    console.error('Realtime test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
