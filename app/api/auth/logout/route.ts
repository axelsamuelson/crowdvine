import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    console.log('=== LOGOUT START ===');

    // Get auth token from request
    const authToken = request.cookies.get('sb-access-auth-token')?.value;
    
    if (authToken) {
      // Create Supabase client with the auth token to sign out the user
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      });

      // Sign out the user from Supabase Auth
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
      } else {
        console.log('Successfully signed out from Supabase Auth');
      }
    }

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

    // Clear all possible Supabase auth cookies
    const cookieNames = [
      'sb-access-auth-token',
      'sb-abrnvjqwpdkodgrtezeg-auth-token',
      'supabase-auth-token'
    ];
    
    cookieNames.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      });
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
