import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendGridService } from "@/lib/sendgrid-service";
import {
  getAccessApprovalEmailTemplate,
  getAccessApprovalEmailText,
} from "@/lib/email-templates";

export async function POST(request: NextRequest) {
  try {
    console.log("=== SEND APPROVAL EMAIL API START ===");

    const { email } = await request.json();
    console.log("DEBUG: Sending approval email to:", email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if access request exists and is approved
    const { data: accessRequest, error: requestError } = await supabase
      .from("access_requests")
      .select("*")
      .eq("email", email)
      .eq("status", "approved")
      .single();

    if (requestError || !accessRequest) {
      console.log("DEBUG: No approved access request found for:", email);
      return NextResponse.json(
        { error: "No approved access request found" },
        { status: 404 },
      );
    }

    console.log("DEBUG: Found approved access request:", accessRequest);

    // Generate signup URL
    console.log("DEBUG: Generating signup URL...");
    const signupResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com"}/api/generate-signup-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      },
    );

    if (!signupResponse.ok) {
      console.error("DEBUG: Failed to generate signup URL");
      return NextResponse.json(
        { error: "Failed to generate signup URL" },
        { status: 500 },
      );
    }

    const { signupUrl } = await signupResponse.json();
    console.log("DEBUG: Signup URL generated:", signupUrl);

    // Send approval email
    console.log("DEBUG: Sending approval email...");
    const emailSent = await sendGridService.sendEmail({
      to: email,
      subject: "🎉 Welcome to PACT Wines - Your Access Has Been Approved!",
      html: getAccessApprovalEmailTemplate(signupUrl),
      text: getAccessApprovalEmailText(signupUrl),
    });

    if (emailSent) {
      console.log("DEBUG: Approval email sent successfully to:", email);
      console.log("=== SEND APPROVAL EMAIL API END ===");
      return NextResponse.json({
        success: true,
        message: "Approval email sent successfully!",
        signupUrl: signupUrl,
      });
    } else {
      console.log("DEBUG: Failed to send approval email to:", email);
      return NextResponse.json(
        { error: "Failed to send approval email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("DEBUG: Error in send approval email API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
