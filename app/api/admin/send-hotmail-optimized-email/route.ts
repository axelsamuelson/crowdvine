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

    console.log("🔥 HOTMAIL OPTIMIZED: Starting approval email for:", email);

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
      console.error("❌ HOTMAIL OPTIMIZED: Failed to generate signup URL");
      return NextResponse.json(
        { error: "Failed to generate signup URL" },
        { status: 500 },
      );
    }

    const signupData = await signupResponse.json();
    const { signupUrl } = signupData;
    console.log("✅ HOTMAIL OPTIMIZED: Signup URL generated:", signupUrl);

    // Generate email templates
    const htmlTemplate = await getAccessApprovalEmailTemplate(signupUrl);
    const textTemplate = await getAccessApprovalEmailText(signupUrl);

    console.log("📧 HOTMAIL OPTIMIZED: Sending optimized email for Hotmail...");

    // Send email with Hotmail-specific optimizations
    const emailSent = await sendGridService.sendEmail({
      to: email,
      subject: "Welcome to PACT - Your Access Has Been Approved", // No emoji for Hotmail
      html: htmlTemplate,
      text: textTemplate,
    });

    console.log("🔥 HOTMAIL OPTIMIZED: SendGrid result:", emailSent);

    if (emailSent) {
      console.log("✅ HOTMAIL OPTIMIZED: Email sent successfully to:", email);

      return NextResponse.json({
        success: true,
        message: "Hotmail-optimized approval email sent successfully",
        email: email,
        timestamp: new Date().toISOString(),
        deliveryMethod: "hotmail-optimized",
        expectedDeliveryTime: "5-15 minutes (Hotmail is slower than Gmail)",
      });
    } else {
      console.error(
        "❌ HOTMAIL OPTIMIZED: Failed to send approval email to:",
        email,
      );
      return NextResponse.json(
        { error: "Failed to send approval email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error(
      "❌ HOTMAIL OPTIMIZED: Error in send-hotmail-optimized-email:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
