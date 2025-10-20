import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";
import {
  getAccessApprovalEmailTemplate,
  getAccessApprovalEmailText,
} from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🚀 FAST EMAIL: Starting approval email for:", email);

    // Generate signup URL
    const signupResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/generate-signup-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    if (!signupResponse.ok) {
      console.error("❌ FAST EMAIL: Failed to generate signup URL");
      return NextResponse.json(
        { error: "Failed to generate signup URL" },
        { status: 500 },
      );
    }

    const signupData = await signupResponse.json();
    const { signupUrl } = signupData;
    console.log("✅ FAST EMAIL: Signup URL generated:", signupUrl);

    // Generate email templates with optimized settings
    const htmlTemplate = await getAccessApprovalEmailTemplate(signupUrl);
    const textTemplate = await getAccessApprovalEmailText(signupUrl);

    console.log("📧 FAST EMAIL: Sending optimized approval email...");

    // Send email with high priority settings
    const emailSent = await sendGridService.sendEmail({
      to: email,
      subject: "✅ Welcome to PACT - Your Access Has Been Approved",
      html: htmlTemplate,
      text: textTemplate,
    });

    console.log("🚀 FAST EMAIL: SendGrid result:", emailSent);

    if (emailSent) {
      console.log("✅ FAST EMAIL: Approval email sent successfully to:", email);

      // Return success with timing info
      return NextResponse.json({
        success: true,
        message: "Approval email sent successfully",
        email: email,
        timestamp: new Date().toISOString(),
        deliveryMethod: "optimized",
      });
    } else {
      console.error("❌ FAST EMAIL: Failed to send approval email to:", email);
      return NextResponse.json(
        { error: "Failed to send approval email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("❌ FAST EMAIL: Error in send-fast-approval-email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
