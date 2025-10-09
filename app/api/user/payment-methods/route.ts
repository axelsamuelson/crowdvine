import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/payment-methods
 * 
 * Returns user's payment methods (placeholder for now)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // TODO: Integrate with Stripe to fetch actual payment methods
    // For now, return empty array
    return NextResponse.json({
      paymentMethods: [],
    });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}
