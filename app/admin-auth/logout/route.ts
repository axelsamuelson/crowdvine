import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL('/admin-auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  
  // Clear both admin cookies
  response.cookies.set('admin-auth', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0 // Expire immediately
  });
  
  response.cookies.set('admin-email', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0 // Expire immediately
  });

  return response;
}
