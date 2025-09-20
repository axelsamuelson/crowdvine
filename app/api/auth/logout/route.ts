import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGOUT START ===');

    const supabase = getSupabaseAdmin();

    // Clear the access cookie
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully"
    });

    // Remove the access cookie
    response.cookies.set('cv-access', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    // Also clear Supabase auth session cookies
    response.cookies.set('sb-access-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    console.log('=== LOGOUT END ===');

    return response;

  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
