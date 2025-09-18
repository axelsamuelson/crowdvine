import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Test email with a simple message
    const emailSent = await sendGridService.sendEmail({
      to: email,
      subject: '🧪 Test Email from PACT Wines',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Test Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🧪 Test Email</h1>
                <p>SendGrid is working!</p>
              </div>
              <div class="content">
                <h2>Congratulations!</h2>
                <p>This is a test email to verify that SendGrid email service is working correctly.</p>
                <p>If you received this email, it means:</p>
                <ul>
                  <li>✅ SendGrid API key is configured correctly</li>
                  <li>✅ Email templates are working</li>
                  <li>✅ Email sending functionality is operational</li>
                </ul>
                <p><strong>PACT Wines Team</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Test Email from PACT Wines

Congratulations!

This is a test email to verify that SendGrid email service is working correctly.

If you received this email, it means:
- SendGrid API key is configured correctly
- Email templates are working  
- Email sending functionality is operational

PACT Wines Team
      `,
    });

    if (emailSent) {
      return NextResponse.json({ 
        success: true, 
        message: "Test email sent successfully!" 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: "Failed to send test email" 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
