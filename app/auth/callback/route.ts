import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  FIRST_TOUCH_KEY,
  VISITOR_ID_KEY,
  parseFirstTouchPayload,
} from "@/lib/analytics/visitor-identity";

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
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        try {
          const sbAdmin = getSupabaseAdmin();
          await sbAdmin.from("profiles").upsert(
            {
              id: user.id,
              email: user.email ?? null,
            },
            { onConflict: "id" },
          );
          void logUserEventServer({
            userId: user.id,
            visitorId: cookieStore.get(VISITOR_ID_KEY)?.value ?? null,
            firstTouch: parseFirstTouchPayload(
              cookieStore.get(FIRST_TOUCH_KEY)?.value ?? null,
            ),
            eventType: "signup_completed",
            eventCategory: "auth",
            metadata: { user_id: user.id },
          });
        } catch (e) {
          console.error("[auth/callback] profile upsert / signup_completed:", e);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (
          session?.user?.app_metadata?.provider === "email" &&
          session?.user?.aud === "authenticated" &&
          next === "/reset-password"
        ) {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
