import { NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST() {
  try {
    console.log("🧪 Testing Order Confirmation Email...");
    
    // Simulate order confirmation data
    const testEmailData = {
      customerEmail: "test@example.com",
      customerName: "Test Customer",
      orderId: "TEST-ORDER-12345",
      orderDate: new Date().toLocaleDateString(),
      items: [
        {
          name: "Matiere Noire 2024",
          quantity: 2,
          price: 98.91,
          image: undefined,
        },
        {
          name: "Test Wine 2023",
          quantity: 1,
          price: 150.00,
          image: undefined,
        }
      ],
      subtotal: 347.82,
      tax: 0,
      shipping: 75.00,
      total: 422.82,
      shippingAddress: {
        name: "Test Customer",
        street: "Test Street 123",
        city: "Stockholm",
        postalCode: "12345",
        country: "Sweden",
      },
    };

    console.log("📧 Sending test order confirmation email with data:", testEmailData);

    // Test the order confirmation email
    const success = await sendGridService.sendOrderConfirmation(testEmailData);

    if (success) {
      console.log("✅ Order confirmation email sent successfully!");
      return NextResponse.json({
        success: true,
        message: "Order confirmation email sent successfully!",
        testData: testEmailData,
        config: {
          hasApiKey: !!process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL,
          fromName: process.env.SENDGRID_FROM_NAME,
        }
      });
    } else {
      console.log("❌ Failed to send order confirmation email");
      return NextResponse.json({
        success: false,
        message: "Failed to send order confirmation email",
        testData: testEmailData,
        config: {
          hasApiKey: !!process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL,
          fromName: process.env.SENDGRID_FROM_NAME,
        }
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ Order confirmation email test error:", error);
    return NextResponse.json({
      success: false,
      message: "Order confirmation email test failed",
      error: error instanceof Error ? error.message : "Unknown error",
      config: {
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        fromEmail: process.env.SENDGRID_FROM_EMAIL,
        fromName: process.env.SENDGRID_FROM_NAME,
      }
    }, { status: 500 });
  }
}
