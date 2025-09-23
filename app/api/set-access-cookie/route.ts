import { NextRequest, NextResponse } from "next/server";
import { ensureAccessCookie } from "@/lib/access";

export async function GET(request: NextRequest) {
  try {
    // Set the access cookie
    await ensureAccessCookie();

    // Get the next parameter for redirect
    const { searchParams } = new URL(request.url);
    const next = searchParams.get("next") || "/";

    // Redirect to the intended destination
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error("Error setting access cookie:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
