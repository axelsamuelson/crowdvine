import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    // Test basic Supabase connection
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    return NextResponse.json({
      success: true,
      user: user ? { id: user.id, email: user.email } : null,
      authError: authError?.message || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
