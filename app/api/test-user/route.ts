import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";

export async function GET() {
  try {
    const user = await getCurrentUser();

    return NextResponse.json({
      user: user
        ? {
            id: user.id,
            email: user.email,
            isAuthenticated: true,
          }
        : {
            isAuthenticated: false,
          },
    });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json({ error: "Failed to get user" }, { status: 500 });
  }
}
