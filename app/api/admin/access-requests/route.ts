import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
    console.log('=== DEBUG: Starting PATCH request ===');
    
    const { id, status, notes } = await request.json();
    console.log('DEBUG: Request data:', { id, status, notes });

    // Check admin cookie
    const adminAuth = request.cookies.get('admin-auth')?.value;
    if (!adminAuth) {
      console.log('DEBUG: No admin auth cookie');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('DEBUG: Admin auth cookie found');

    // Get the access request to find the email
    const supabase = getSupabaseAdmin();
    console.log('DEBUG: Fetching access request with ID:', id);
    
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      console.error('DEBUG: Error fetching access request:', fetchError);
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }
    console.log('DEBUG: Access request found:', accessRequest);

    // Test simple update first - just status
    console.log('DEBUG: Testing simple update...');
    const { data: simpleUpdate, error: simpleError } = await supabase
      .from('access_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (simpleError) {
      console.error('DEBUG: Simple update failed:', simpleError);
      console.error('DEBUG: Simple update error details:', JSON.stringify(simpleError, null, 2));
      return NextResponse.json({ error: "Failed to update access request" }, { status: 500 });
    }
    console.log('DEBUG: Simple update successful:', simpleUpdate);

    // Now try the full update
    console.log('DEBUG: Testing full update...');
    const { data: fullUpdate, error: fullError } = await supabase
      .from('access_requests')
      .update({
        status,
        notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'admin',
      })
      .eq('id', id)
      .select()
      .single();

    if (fullError) {
      console.error('DEBUG: Full update failed:', fullError);
      console.error('DEBUG: Full update error details:', JSON.stringify(fullError, null, 2));
      // Return success anyway since simple update worked
      return NextResponse.json({ success: true, data: simpleUpdate });
    }
    console.log('DEBUG: Full update successful:', fullUpdate);

    // If approved, grant access to the user
    if (status === 'approved') {
      console.log('DEBUG: Processing approval for:', accessRequest.email);
      
      // Use admin client to find user by email
      const { data: authUser, error: userError } = await supabase.auth.admin.getUserByEmail(accessRequest.email);
      
      if (userError || !authUser.user) {
        console.log('DEBUG: User not found in auth, will grant access when they sign up:', accessRequest.email);
        
        // Generate signup URL and send email
        try {
          const signupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com'}/api/generate-signup-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: accessRequest.email })
          });
          
          if (signupResponse.ok) {
            const { signupUrl } = await signupResponse.json();
            console.log('DEBUG: Signup URL generated for:', accessRequest.email, 'URL:', signupUrl);
            
            // Try to send approval email, but don't fail if it doesn't work
            try {
              // For now, just log that we would send email
              console.log('DEBUG: Would send approval email to:', accessRequest.email, 'with URL:', signupUrl);
            } catch (emailError) {
              console.log('DEBUG: Email sending failed, but signup URL generated:', signupUrl);
            }
          } else {
            console.error('DEBUG: Failed to generate signup URL for:', accessRequest.email);
          }
        } catch (signupError) {
          console.error('DEBUG: Error generating signup URL:', signupError);
        }
      } else {
        // User exists, grant access immediately
        console.log('DEBUG: User exists, granting access immediately:', accessRequest.email);
        const now = new Date().toISOString();
        
        // Update profiles table with access_granted_at
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authUser.user.id,
            access_granted_at: now
          });

        if (profileError) {
          console.error('DEBUG: Error updating profiles:', profileError);
        }

        console.log('DEBUG: Access granted to user:', accessRequest.email);
      }
    }

    console.log('DEBUG: Returning success response');
    return NextResponse.json({ success: true, data: fullUpdate });

  } catch (error) {
    console.error('DEBUG: Unexpected error in PATCH:', error);
    console.error('DEBUG: Error stack:', error.stack);
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