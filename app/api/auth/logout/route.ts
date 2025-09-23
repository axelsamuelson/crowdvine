import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({ message: "Logged out successfully" });

    // Clear all authentication cookies
    const cookiesToClear = [
      'cv-access',
      'sb-access-auth-token',
      'sb-abrnvjqwpdkodgrtezeg-auth-token',
      'supabase-auth-token',
      'admin-auth',
      'admin-email'
    ];

    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? '.pactwines.com' : undefined
      });
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}