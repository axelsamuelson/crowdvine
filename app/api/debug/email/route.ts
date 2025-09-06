import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";

export async function GET() {
  try {
    // Test email service configuration
    const testResult = await emailService.sendReservationConfirmation({
      reservationId: "test-123",
      trackingCode: "12345678",
      customerName: "Test User",
      customerEmail: "test@example.com",
      items: [
        {
          wineName: "Test Wine",
          vintage: "2023",
          quantity: 1,
          price: "100.00",
        },
      ],
      totalAmount: "100.00",
      address: {
        street: "Test Street",
        postcode: "12345",
        city: "Test City",
        countryCode: "SE",
      },
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      emailSent: testResult,
      message: "Email service test completed",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    );
  }
}
