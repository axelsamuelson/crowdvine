import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { emailService } from "@/lib/email-service";

export async function GET(request: NextRequest) {
  try {
    console.log('Access requests API: Starting request');
    
    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      console.log('Access requests API: No admin auth cookie');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log('Access requests API: Admin auth confirmed');

    // Fetch all access requests first
    const supabase = getSupabaseAdmin();
    const { data: accessRequests, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json({ error: "Failed to fetch access requests" }, { status: 500 });
    }

    if (!accessRequests || accessRequests.length === 0) {
      return NextResponse.json([]);
    }

    // Get all profiles with access_granted_at for filtering
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, access_granted_at')
      .not('access_granted_at', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      // Don't fail the request, just return all access requests
      return NextResponse.json(accessRequests);
    }

    // Filter out requests that have associated user accounts (profiles with access_granted_at)
    const emailsWithAccess = new Set(profiles?.map(p => p.email) || []);
    const filteredRequests = accessRequests.filter(request => 
      !emailsWithAccess.has(request.email)
    );

    return NextResponse.json(filteredRequests);

  } catch (error) {
    console.error('Access requests API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json();

    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the access request to find the email
    const supabase = getSupabaseAdmin();
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      console.error('Error fetching access request:', fetchError);
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    // Update access request
    const { data, error } = await supabase
      .from('access_requests')
      .update({
        status,
        notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin', // Simplified since we're using cookie auth
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating access request:', error);
      return NextResponse.json({ error: "Failed to update access request" }, { status: 500 });
    }

    // If approved, grant access to the user
    if (status === 'approved') {
      // Use admin client to find user by email
      const { data: authUser, error: userError } = await supabase.auth.admin.getUserByEmail(accessRequest.email);
      
      if (userError || !authUser.user) {
        console.log('User not found in auth, will grant access when they sign up:', accessRequest.email);
        
        // Generate signup URL and send email
        try {
          const signupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com'}/api/generate-signup-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: accessRequest.email })
          });
          
          if (signupResponse.ok) {
            const { signupUrl } = await signupResponse.json();
            console.log('Signup URL generated for:', accessRequest.email, 'URL:', signupUrl);
            
            // Try to send approval email, but don't fail if it doesn't work
            try {
              const emailSent = await emailService.sendAccessApprovalEmail({
                email: accessRequest.email,
                signupUrl
              });
              
              if (emailSent) {
                console.log('Approval email sent to:', accessRequest.email);
              } else {
                console.log('Email service not configured, but signup URL generated:', signupUrl);
              }
            } catch (emailError) {
              console.log('Email sending failed, but signup URL generated:', signupUrl);
            }
          } else {
            console.error('Failed to generate signup URL for:', accessRequest.email);
          }
        } catch (signupError) {
          console.error('Error generating signup URL:', signupError);
        }
      } else {
        // User exists, grant access immediately
        const now = new Date().toISOString();
        
        // Update profiles table with access_granted_at
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            access_granted_at: now
          });

        if (profileError) {
          console.error('Error updating profiles:', profileError);
        }

        // Update user_access table (if it exists)
        const { error: userAccessError } = await supabase
          .from('user_access')
          .upsert({
            user_id: authUser.user.id,
            email: accessRequest.email,
            access_granted_at: now,
            status: 'active',
            granted_by: 'admin'
          });

        if (userAccessError) {
          console.error('Error updating user_access:', userAccessError);
          // Don't fail the request, just log the error
        } else {
          console.log('Access granted to user:', accessRequest.email);
        }
      }
    }

    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Update access request API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the access request
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from('access_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting access request:', error);
      return NextResponse.json({ error: "Failed to delete access request" }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete access request API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
