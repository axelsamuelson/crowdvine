import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE USER API START ===');
    
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    if (!signupLimiter.isAllowed(clientId)) {
      const resetTime = signupLimiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      console.log('Rate limit exceeded for client:', clientId);
      return NextResponse.json(
        { 
          error: 'Too many signup attempts. Please try again later.',
          retryAfter: retryAfter,
          resetTime: new Date(resetTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    const { email, password, userId } = await request.json();
    console.log('Request data:', { email, hasPassword: !!password, userId });

    if (!email || !password) {
      console.log('Missing required fields:', { email: !!email, password: !!password });
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Normalized email:', normalizedEmail);

    // Step 1: Check if user already exists in auth.users
    console.log('1. Checking if user exists in auth.users...');
    
    // Try to get user by email using the old API
    let existingUserData = null;
    let userCheckError = null;
    
    try {
      // Use the old API method that should still work
      const result = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      
      if (result.data && result.data.users) {
        existingUserData = result.data.users.find(user => user.email === normalizedEmail);
        console.log('2a. User search result:', existingUserData ? 'Found' : 'Not found');
      }
    } catch (error) {
      console.error('Error checking existing user:', error);
      userCheckError = error;
    }
    
    if (userCheckError) {
      console.error('Error checking existing user:', userCheckError);
      return NextResponse.json({ 
        error: "Failed to check existing user",
        details: userCheckError.message,
        code: userCheckError.status || 'unknown'
      }, { status: 500 });
    }
    
    let authUserId: string;
    
    if (existingUserData) {
      authUserId = existingUserData.id;
      console.log('2a. User already exists in auth.users:', authUserId);
      
      // Check if user already has a profile with access
      console.log('2b. Checking existing profile...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('access_granted_at')
        .eq('id', authUserId)
        .maybeSingle();
      
      if (profileCheckError) {
        console.error('Error checking existing profile:', profileCheckError);
        return NextResponse.json({ 
          error: "Failed to check existing profile",
          details: profileCheckError.message,
          code: profileCheckError.code || 'unknown'
        }, { status: 500 });
      }
      
      if (existingProfile?.access_granted_at) {
        console.log('2c. User already has access, returning success');
        return NextResponse.json({ 
          success: true,
          message: "User already has access to the platform",
          user: {
            id: authUserId,
            email: normalizedEmail
          }
        });
      }
      
      // User exists but no profile with access - create/update profile
      console.log('2d. Creating/updating profile for existing user...');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUserId,
          email: normalizedEmail,
          role: 'user',
          access_granted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        return NextResponse.json({ 
          error: "Failed to create profile",
          details: profileError.message,
          code: profileError.code || 'unknown'
        }, { status: 500 });
      }
      
      console.log('2e. Profile created/updated successfully');
      
    } else {
      // Step 2: Create new user
      console.log('3a. Creating new user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true // Skip email verification
      });

      if (authError) {
        console.error('Error creating user:', authError);
        return NextResponse.json({ 
          error: "Failed to create user",
          details: authError.message,
          code: authError.status || 'unknown',
          debug: {
            email: normalizedEmail,
            hasPassword: !!password,
            errorType: 'auth_creation_failed'
          }
        }, { status: 500 });
      }

      if (!authData || !authData.user) {
        console.error('User creation returned no user data');
        return NextResponse.json({ 
          error: "User creation failed",
          details: "No user data returned from auth creation",
          debug: {
            email: normalizedEmail,
            authData: authData
          }
        }, { status: 500 });
      }
      
      authUserId = authData.user.id;
      console.log('3b. New user created:', authUserId);

      // Step 3: Check if profile already exists and create/update it
      console.log('3c. Checking if profile already exists...');
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, access_granted_at')
        .eq('id', authUserId)
        .maybeSingle();

      if (profileCheckError) {
        console.error('Error checking existing profile:', profileCheckError);
        return NextResponse.json({ 
          error: "Failed to check existing profile",
          details: profileCheckError.message,
          code: profileCheckError.code || 'unknown'
        }, { status: 500 });
      }

      if (existingProfile?.access_granted_at) {
        console.log('3c1. Profile already exists with access, skipping creation');
      } else {
        console.log('3c2. Creating/updating profile for new user...');
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authUserId,
          email: normalizedEmail,
          role: 'user',
          access_granted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id',
          ignoreDuplicates: false // Update existing records
        });

      if (profileError) {
        console.error('Error creating/updating profile:', profileError);
        console.error('Profile error details:', {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        });
        return NextResponse.json({ 
          error: "Failed to create profile",
          details: profileError.message,
          code: profileError.code || 'unknown',
          debug: {
            authUserId: authUserId,
            email: normalizedEmail,
            errorType: 'profile_creation_failed',
            errorDetails: profileError.details,
            errorHint: profileError.hint
          }
        }, { status: 500 });
      }
      
      console.log('3d. Profile created/updated successfully');
      }
    }

    // Step 4: Clean up any remaining access requests for this email
    console.log('4. Cleaning up access requests...');
    const { error: cleanupError } = await supabase
      .from('access_requests')
      .delete()
      .eq('email', normalizedEmail);
    
    if (cleanupError) {
      console.error('Error cleaning up access requests:', cleanupError);
      // Don't fail the request for cleanup errors
    } else {
      console.log('4b. Access requests cleaned up');
    }

    // User and profile created/updated successfully
    console.log('5. User creation completed successfully');
    const response = NextResponse.json({ 
      success: true, 
      message: "User account created/updated successfully",
      user: {
        id: authUserId,
        email: normalizedEmail
      }
    });

    // Set access cookie so user can access the app
    response.cookies.set('cv-access', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });

    // CRITICAL: Create a proper auth session for the new user
    // This prevents the user from being logged into someone else's account
    console.log('6. Creating auth session for new user...');
    try {
      // Use admin API to create a session for the user
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: normalizedEmail
      });

      if (sessionError) {
        console.error('Error generating magic link:', sessionError);
        // Fallback: try to create a session using password
        console.log('6b. Trying password-based session creation...');
        const { data: passwordSession, error: passwordError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password
        });

        if (passwordError) {
          console.error('Error creating password session:', passwordError);
        } else if (passwordSession?.session?.access_token) {
          // Set the auth session cookie with the access token
          response.cookies.set('sb-access-auth-token', passwordSession.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/'
          });
          console.log('6c. Auth session cookie set via password login');
        }
      } else if (sessionData?.properties?.hashed_token) {
        // Set the auth session cookie
        response.cookies.set('sb-access-auth-token', sessionData.properties.hashed_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: '/'
        });
        console.log('6a. Auth session cookie set via magic link');
      }
    } catch (sessionError) {
      console.error('Error creating auth session:', sessionError);
      // Don't fail the request for session creation errors
    }

    console.log('=== CREATE USER API END ===');
    return response;

  } catch (error) {
    console.error('=== CREATE USER API ERROR ===');
    console.error('Unexpected error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        errorType: 'unexpected_error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}