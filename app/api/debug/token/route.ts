import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    console.log('=== DEBUG TOKEN VALIDATION START ===');
    console.log('Token:', token);

    const supabase = getSupabaseAdmin();

    // Check if token exists and is valid
    const { data: tokenData, error } = await supabase
      .from('access_tokens')
      .select('*')
      .eq('token', token)
      .single();

    console.log('Token query result:', { tokenData, error });

    if (error || !tokenData) {
      console.log('Token not found or error:', error);
      return NextResponse.json({
        success: false,
        message: 'Token not found',
        details: error?.message || 'Token does not exist',
        debug: {
          token: token,
          error: error
        }
      });
    }

    console.log('Token found:', {
      id: tokenData.id,
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

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(tokenData.email);
    console.log('Existing user check:', {
      email: tokenData.email,
      userExists: !!existingUser?.user,
      userId: existingUser?.user?.id
    });

    // Check if profile exists
    let profileExists = false;
    let hasAccess = false;
    if (existingUser?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('access_granted_at')
        .eq('id', existingUser.user.id)
        .single();
      
      profileExists = !!profile;
      hasAccess = !!profile?.access_granted_at;
      
      console.log('Profile check:', {
        profileExists: profileExists,
        hasAccess: hasAccess,
        access_granted_at: profile?.access_granted_at
      });
    }

    const isValid = !isExpired && !isUsed;

    console.log('=== DEBUG TOKEN VALIDATION END ===');

    return NextResponse.json({
      success: true,
      token: {
        id: tokenData.id,
        email: tokenData.email,
        expires_at: tokenData.expires_at,
        used: tokenData.used,
        created_at: tokenData.created_at,
        isValid: isValid,
        isExpired: isExpired,
        isUsed: isUsed
      },
      user: {
        email: tokenData.email,
        userExists: !!existingUser?.user,
        userId: existingUser?.user?.id,
        profileExists: profileExists,
        hasAccess: hasAccess
      },
      debug: {
        timestamp: now.toISOString(),
        tokenProvided: token
      }
    });

  } catch (error) {
    console.error('Debug token validation error:', error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
