import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skydda admin routes
  if (pathname.startsWith('/admin')) {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        // Redirect till login om inte autentiserad
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Kolla admin permissions
      if (user.role !== 'admin') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Skydda producer routes
  if (pathname.startsWith('/producer')) {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Kolla producer permissions
      if (user.role !== 'producer' && user.role !== 'admin') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/producer/:path*'],
};
