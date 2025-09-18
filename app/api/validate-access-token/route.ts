import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    console.log('=== VALIDATE TOKEN GET START ===');
    console.log('Token:', token);

    const adminSupabase = getSupabaseAdmin();

    // Check if token exists and is valid
    const { data: tokenData, error } = await adminSupabase
      .from('access_tokens')
      .select('email, expires_at, used, created_at')
      .eq('token', token)
      .single();

    console.log('Token query result:', { tokenData, error });

    if (error || !tokenData) {
      console.error('Token validation error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid access token',
        details: error?.message || 'Token not found',
        debug: {
          token: token,
          error: error
        }
      });
    }

    console.log('Token found:', {
      email: tokenData.email,
      expires_at: tokenData.expires_at,
      used: tokenData.used,
      created_at: tokenData.created_at
    });

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    const isExpired = now > expiresAt;

    console.log('Token expiration check:', {
      now: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      isExpired: isExpired
    });

    // Check if token is already used
    const isUsed = tokenData.used;

    console.log('Token usage check:', {
      used: isUsed
    });

    const isValid = !isExpired && !isUsed;

    console.log('=== VALIDATE TOKEN GET END ===');

    return NextResponse.json({ 
      success: isValid,
      email: tokenData.email,
      token: {
        expires_at: tokenData.expires_at,
        used: tokenData.used,
        created_at: tokenData.created_at,
        isValid: isValid,
        isExpired: isExpired,
        isUsed: isUsed
      },
      debug: {
        timestamp: now.toISOString(),
        tokenProvided: token
      }
    });

  } catch (error) {
    console.error('Validate access token GET API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

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
      console.error('Token validation error:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid access token',
        details: error?.message || 'Token not found'
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
