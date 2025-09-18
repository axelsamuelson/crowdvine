import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: NextRequest) {
  try {
    console.log('=== SEND APPROVAL EMAIL API START ===');
    
    const { email } = await request.json();
    console.log('DEBUG: Sending approval email to:', email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if access request exists and is approved
    const { data: accessRequest, error: requestError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('email', email)
      .eq('status', 'approved')
      .single();

    if (requestError || !accessRequest) {
      console.log('DEBUG: No approved access request found for:', email);
      return NextResponse.json({ error: "No approved access request found" }, { status: 404 });
    }

    console.log('DEBUG: Found approved access request:', accessRequest);

    // Generate signup URL
    console.log('DEBUG: Generating signup URL...');
    const signupResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://pactwines.com'}/api/generate-signup-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (!signupResponse.ok) {
      console.error('DEBUG: Failed to generate signup URL');
      return NextResponse.json({ error: "Failed to generate signup URL" }, { status: 500 });
    }

    const { signupUrl } = await signupResponse.json();
    console.log('DEBUG: Signup URL generated:', signupUrl);

    // Send approval email
    console.log('DEBUG: Sending approval email...');
    const emailSent = await sendGridService.sendEmail({
      to: email,
      subject: '🎉 Welcome to PACT Wines - Your Access Has Been Approved!',
      html: getAccessApprovalEmailTemplate(signupUrl),
      text: getAccessApprovalEmailText(signupUrl),
    });

    if (emailSent) {
      console.log('DEBUG: Approval email sent successfully to:', email);
      console.log('=== SEND APPROVAL EMAIL API END ===');
      return NextResponse.json({ 
        success: true, 
        message: "Approval email sent successfully!",
        signupUrl: signupUrl
      });
    } else {
      console.log('DEBUG: Failed to send approval email to:', email);
      return NextResponse.json({ error: "Failed to send approval email" }, { status: 500 });
    }

  } catch (error) {
    console.error('DEBUG: Error in send approval email API:', error);
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
