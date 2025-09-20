import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL('/admin-auth/login', 'https://pactwines.com'));
  
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
