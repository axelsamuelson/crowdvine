import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => {
            cookieStore.set(name, value, options);
          },
          remove: (name: string, options: any) => {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Check if this is a password reset flow
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user needs to reset password (session has password reset flag)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.app_metadata?.provider === 'email' && 
            session?.user?.aud === 'authenticated') {
          // Redirect to reset password page
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }
      
      // Normal auth flow - redirect to intended page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
