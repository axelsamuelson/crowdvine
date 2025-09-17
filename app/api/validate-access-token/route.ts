import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // Check if token exists and is valid
    const { data: tokenData, error } = await adminSupabase
      .from('access_tokens')
      .select('email, expires_at, used')
      .eq('token', token)
      .single();

    if (error || !tokenData) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid access token' 
      });
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access token has expired' 
      });
    }

    // Check if token is already used
    if (tokenData.used) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access token has already been used' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      email: tokenData.email 
    });

  } catch (error) {
    console.error('Validate access token API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
