import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendGridService } from "@/lib/sendgrid-service";
import { getAccessApprovalEmailTemplate, getAccessApprovalEmailText } from "@/lib/email-templates";

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

    // Use admin client to bypass RLS
    const supabase = getSupabaseAdmin();
    
    // Fetch all access requests first
    const { data: accessRequests, error } = await supabase
      .from('access_requests')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching access requests:', error);
      return NextResponse.json({ 
        error: "Failed to fetch access requests",
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log('Access requests found:', accessRequests?.length || 0);

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

    console.log('Profiles with access:', profiles?.length || 0);
    console.log('Profiles data:', profiles);

    // Filter out requests that have associated user accounts (profiles with access_granted_at)
    const emailsWithAccess = new Set(profiles?.map(p => p.email) || []);
    console.log('Emails with access:', Array.from(emailsWithAccess));
    
    const filteredRequests = accessRequests.filter(request => {
      const hasAccess = emailsWithAccess.has(request.email);
      console.log(`Request ${request.email} has access: ${hasAccess}`);
      return !hasAccess;
    });

    console.log('Filtered requests:', filteredRequests.length);
    console.log('All requests before filtering:', accessRequests.length);
    
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

    // Get admin user ID for reviewed_by field
    const adminEmail = request.cookies.get('admin-email')?.value;
    let adminUserId = null;
    if (adminEmail) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserByEmail(adminEmail);
        adminUserId = adminUser?.user?.id;
        console.log('DEBUG: Admin user ID found:', adminUserId);
      } catch (error) {
        console.log('DEBUG: Could not get admin user ID:', error);
      }
    }

    // Try the full update with admin user ID
    console.log('DEBUG: Testing full update with admin ID:', adminUserId);
    const updateData = {
      status,
      notes: notes || null,
      reviewed_at: new Date().toISOString(),
    };
    
    // Only add reviewed_by if we have adminUserId
    if (adminUserId) {
      updateData.reviewed_by = adminUserId;
    }

    const { data: fullUpdate, error: fullError } = await supabase
      .from('access_requests')
      .update(updateData)
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
              console.log('DEBUG: Sending approval email to:', accessRequest.email, 'with URL:', signupUrl);
              
              const emailSent = await sendGridService.sendEmail({
                to: accessRequest.email,
                subject: '🎉 Welcome to PACT Wines - Your Access Has Been Approved!',
                html: getAccessApprovalEmailTemplate(signupUrl),
                text: getAccessApprovalEmailText(signupUrl),
              });
              
              if (emailSent) {
                console.log('DEBUG: Approval email sent successfully to:', accessRequest.email);
              } else {
                console.log('DEBUG: Failed to send approval email to:', accessRequest.email);
              }
            } catch (emailError) {
              console.log('DEBUG: Email sending failed, but signup URL generated:', signupUrl);
              console.error('DEBUG: Email error:', emailError);
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
    console.log('=== DELETE ACCESS REQUEST START ===');
    
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

    const supabase = getSupabaseAdmin();

    // Step 1: Get the access request to find the email
    console.log('1. Fetching access request details...');
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError || !accessRequest) {
      console.error('Error fetching access request:', fetchError);
      return NextResponse.json({ error: "Access request not found" }, { status: 404 });
    }

    const email = accessRequest.email.toLowerCase().trim();
    console.log('2. Found access request for email:', email);

    // Step 2: Delete all access tokens for this email
    console.log('3. Deleting access tokens...');
    const { data: deletedTokens, error: tokensError } = await supabase
      .from('access_tokens')
      .delete()
      .eq('email', email)
      .select();

    if (tokensError) {
      console.error('Error deleting access tokens:', tokensError);
    } else {
      console.log(`   ✅ Deleted ${deletedTokens?.length || 0} access tokens`);
    }

    // Step 3: Delete all invitation codes for this email (if any)
    console.log('4. Deleting invitation codes...');
    const { data: deletedInvitations, error: invitationsError } = await supabase
      .from('invitation_codes')
      .delete()
      .eq('email', email)
      .select();

    if (invitationsError) {
      console.error('Error deleting invitation codes:', invitationsError);
    } else {
      console.log(`   ✅ Deleted ${deletedInvitations?.length || 0} invitation codes`);
    }

    // Step 4: Check if user exists in auth.users and delete if no profile exists
    console.log('5. Checking for orphaned auth user...');
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(email);
    
    if (authUser?.user) {
      // Check if user has a profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authUser.user.id)
        .single();

      if (!profile) {
        console.log('6. Deleting orphaned auth user...');
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(authUser.user.id);
        
        if (deleteUserError) {
          console.error('Error deleting auth user:', deleteUserError);
        } else {
          console.log('   ✅ Deleted orphaned auth user');
        }
      } else {
        console.log('   ℹ️ User has profile, keeping auth user');
      }
    }

    // Step 5: Finally delete the access request
    console.log('7. Deleting access request...');
    const { error: deleteError } = await supabase
      .from('access_requests')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting access request:', deleteError);
      return NextResponse.json({ error: "Failed to delete access request" }, { status: 500 });
    }

    console.log('   ✅ Access request deleted successfully');
    console.log('=== DELETE ACCESS REQUEST END ===');

    return NextResponse.json({ 
      success: true,
      message: `Access request and all related data deleted for ${email}`,
      deleted: {
        accessRequest: 1,
        accessTokens: deletedTokens?.length || 0,
        invitationCodes: deletedInvitations?.length || 0,
        authUser: authUser?.user && !profile ? 1 : 0
      }
    });

  } catch (error) {
    console.error('Delete access request API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
