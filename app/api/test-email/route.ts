import { NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST() {
  try {
    console.log("🧪 Testing SendGrid configuration...");
    
    // Test with a simple email
    const success = await sendGridService.sendEmail({
      to: "test@example.com", // This won't actually send, just test config
      subject: "Test Email - SendGrid Configuration",
      html: "<h1>Test Email</h1><p>This is a test to verify SendGrid configuration.</p>",
      text: "Test Email - This is a test to verify SendGrid configuration.",
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: "SendGrid configuration is working correctly",
        config: {
          hasApiKey: !!process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL,
          fromName: process.env.SENDGRID_FROM_NAME,
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: "SendGrid configuration failed",
        config: {
          hasApiKey: !!process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL,
          fromName: process.env.SENDGRID_FROM_NAME,
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error("SendGrid test error:", error);
    return NextResponse.json({
      success: false,
      message: "SendGrid test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      config: {
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL,
        fromName: process.env.SENDGRID_FROM_NAME,
      }
    }, { status: 500 });
  }
}