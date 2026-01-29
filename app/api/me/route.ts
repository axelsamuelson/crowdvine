import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/me
 * 
 * Check if current user is logged in (returns user info or isGuest: true)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ isGuest: true }, { status: 200 });
    }
    return NextResponse.json({ 
      isGuest: false, 
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        roles: user.roles,
      }
    });
  } catch (error) {
    console.error("Error checking user status:", error);
    return NextResponse.json({ isGuest: true }, { status: 200 });
  }
}
