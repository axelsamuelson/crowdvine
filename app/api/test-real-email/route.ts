import { NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    console.log("🧪 Testing real email to:", email);
    
    // Test with real email data
    const testEmailData = {
      customerEmail: email,
      customerName: "Test Customer",
      orderId: "REAL-TEST-12345",
      orderDate: new Date().toLocaleDateString(),
      items: [
        {
          name: "Matiere Noire 2024",
          quantity: 2,
          price: 98.91,
          image: undefined,
        }
      ],
      subtotal: 197.82,
      tax: 0,
      shipping: 75.00,
      total: 272.82,
      shippingAddress: {
        name: "Test Customer",
        street: "Test Street 123",
        city: "Stockholm",
        postalCode: "12345",
        country: "Sweden",
      },
    };

    console.log("📧 Sending real test email to:", email);

    // Test the order confirmation email
    const success = await sendGridService.sendOrderConfirmation(testEmailData);

    if (success) {
      console.log("✅ Real email sent successfully to:", email);
      return NextResponse.json({
        success: true,
        message: `Order confirmation email sent successfully to ${email}!`,
        testData: testEmailData,
      });
    } else {
      console.log("❌ Failed to send real email to:", email);
      return NextResponse.json({
        success: false,
        message: `Failed to send order confirmation email to ${email}`,
        testData: testEmailData,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Real email test error:", error);
    return NextResponse.json({
      success: false,
      message: "Real email test failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
