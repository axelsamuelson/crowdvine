import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skapa Supabase client för middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          request.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options: any) => {
          request.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Skydda admin routes (exkludera login och unauthorized)
  if (pathname.startsWith('/admin') && 
      pathname !== '/admin/login' && 
      pathname !== '/admin/unauthorized' &&
      !pathname.startsWith('/admin/login/') && 
      !pathname.startsWith('/admin/unauthorized/')) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        // Redirect till login om inte autentiserad
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Hämta user profile med role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Kolla admin permissions
      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/admin/unauthorized', request.url));
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Skydda producer routes
  if (pathname.startsWith('/producer')) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        return NextResponse.redirect(new URL('/admin/login', request.url));
      }

      // Hämta user profile med role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Kolla producer permissions
      if (profile?.role !== 'producer' && profile?.role !== 'admin') {
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
