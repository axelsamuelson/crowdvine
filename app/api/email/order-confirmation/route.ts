import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    // NOTE: allow numeric 0 (e.g. tax: 0) by checking undefined/null instead of falsy.
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
    ] as const;

    for (const field of requiredFields) {
      const value = data?.[field];
      if (value === undefined || value === null) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
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
