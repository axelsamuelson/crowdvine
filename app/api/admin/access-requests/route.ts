import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendGridService } from "@/lib/sendgrid-service";

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

    // Get admin user ID for reviewed_by field
    const adminEmail = request.cookies.get('admin-email')?.value;
    let adminUserId = null;
    if (adminEmail) {
      const { data: adminUser } = await supabase.auth.admin.getUserByEmail(adminEmail);
      adminUserId = adminUser?.user?.id;
    }

    // Now try the full update
    console.log('DEBUG: Testing full update...');
    const { data: fullUpdate, error: fullError } = await supabase
      .from('access_requests')
      .update({
        status,
        notes: notes || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
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

// Email template functions
function getAccessApprovalEmailTemplate(signupUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to PACT Wines</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍷 Welcome to PACT Wines!</h1>
            <p>Your access request has been approved</p>
          </div>
          <div class="content">
            <h2>Congratulations!</h2>
            <p>We're excited to welcome you to PACT Wines, the exclusive wine community where quality meets community.</p>
            
            <p>Your access request has been approved, and you're now ready to join our curated platform featuring:</p>
            <ul>
              <li>🎯 Exclusive wines from boutique producers</li>
              <li>📦 Pallet-sharing system for premium accessibility</li>
              <li>👥 Community of wine enthusiasts and collectors</li>
              <li>🍾 Limited releases and rare vintages</li>
            </ul>
            
            <p>Click the button below to complete your registration and start exploring:</p>
            
            <div style="text-align: center;">
              <a href="${signupUrl}" class="button">Complete Registration</a>
            </div>
            
            <p><strong>Important:</strong> This link is unique to you and will expire in 7 days for security reasons.</p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Welcome to the community!</p>
            <p><strong>The PACT Wines Team</strong></p>
          </div>
          <div class="footer">
            <p>This email was sent because you requested access to PACT Wines.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function getAccessApprovalEmailText(signupUrl: string): string {
  return `
Welcome to PACT Wines!

Your access request has been approved!

We're excited to welcome you to PACT Wines, the exclusive wine community where quality meets community.

Your access request has been approved, and you're now ready to join our curated platform featuring:
- Exclusive wines from boutique producers
- Pallet-sharing system for premium accessibility  
- Community of wine enthusiasts and collectors
- Limited releases and rare vintages

Complete your registration by clicking this link:
${signupUrl}

Important: This link is unique to you and will expire in 7 days for security reasons.

If you have any questions, feel free to reach out to our support team.

Welcome to the community!
The PACT Wines Team

---
This email was sent because you requested access to PACT Wines.
If you didn't request this, please ignore this email.
  `;
}