import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      "customerEmail",
      "customerName",
      "orderId",
      "orderDate",
      "items",
      "subtotal",
      "tax",
      "shipping",
      "total",
      "shippingAddress",
    ];

    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    const success = await sendGridService.sendOrderConfirmation({
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      orderId: data.orderId,
      orderDate: data.orderDate,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      shipping: data.shipping,
      total: data.total,
      shippingAddress: data.shippingAddress,
    });

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Order confirmation email sent successfully",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to send order confirmation email",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Order confirmation email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
