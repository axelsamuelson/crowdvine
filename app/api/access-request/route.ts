import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { accessRequestLimiter, getClientIdentifier } from "@/lib/rate-limiter";

export async function POST(req: Request) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(req);
    if (!accessRequestLimiter.isAllowed(clientId)) {
      const resetTime = accessRequestLimiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      
      return NextResponse.json(
        { 
          error: 'Too many access requests. Please try again later.',
          retryAfter: retryAfter,
          resetTime: new Date(resetTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString()
          }
        }
      );
    }

    const { email } = await req.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sb = getSupabaseAdmin();

    // Check if user already has access
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('access_granted_at')
      .eq('email', normalizedEmail)
      .not('access_granted_at', 'is', null)
      .single();

    if (existingProfile?.access_granted_at) {
      return NextResponse.json({ 
        error: 'This email already has access to the platform',
        details: 'Please try logging in instead of requesting access'
      }, { status: 409 });
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await sb
      .from('access_requests')
      .select('id, status')
      .eq('email', normalizedEmail)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ 
        success: true, 
        message: "You already have a pending access request. We'll review it soon." 
      });
    }

    // Insert new access request
    const { data, error } = await sb
      .from('access_requests')
      .insert({
        email: normalizedEmail,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      // If email already exists with different status, update it to pending
      if (error.code === '23505') { // Unique constraint violation
        const { error: updateError } = await sb
          .from('access_requests')
          .update({ 
            status: 'pending',
            requested_at: new Date().toISOString(),
            reviewed_at: null,
            reviewed_by: null,
            notes: null
          })
          .eq('email', normalizedEmail);
        
        if (updateError) {
          console.error('Error updating access request:', updateError);
          return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          message: "Access request updated! We'll review your application soon." 
        });
      }
      
      console.error('Error creating access request:', error);
      return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Access request submitted! We'll review your application soon." 
    });

  } catch (error) {
    console.error('Access request API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}