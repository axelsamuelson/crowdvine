"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clearAuthEmailCookie,
  clearAuthNextCookieClient,
} from "@/lib/auth/auth-flow-cookies";

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/checkout";
}

/**
 * Client-side PKCE exchange.
 *
 * The code-verifier cookie was written by createBrowserClient (document.cookie)
 * when signInWithOtp ran. Server /auth/callback must NOT exchange first — see
 * that route's header comment about the shared single-use OTP token.
 *
 * @supabase/ssr also sets detectSessionInUrl: true (hardcoded after our
 * options), so we tolerate a race: prefer an existing session, then exchange.
 */
function AuthPkceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Loggar in…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const code = searchParams.get("code");
      const next = safeNextPath(searchParams.get("next"));
      const errorQs = new URLSearchParams({ next });

      if (!code) {
        router.replace(`/auth/auth-code-error?${errorQs.toString()}`);
        return;
      }

      const supabase = getSupabaseBrowserClient();

      // Brief yield so detectSessionInUrl can finish if it wins the race.
      await new Promise((r) => setTimeout(r, 80));
      if (cancelled) return;

      let {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;

        if (error) {
          ({
            data: { session },
          } = await supabase.auth.getSession());
          if (!session) {
            console.error("[auth/pkce] exchange failed:", error.message);
            router.replace(`/auth/auth-code-error?${errorQs.toString()}`);
            return;
          }
        }
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id) {
        await fetch("/api/auth/finalize-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            source: next.startsWith("/checkout")
              ? "checkout_magic_link"
              : "magic_link",
            emit_signup_completed: true,
          }),
        }).catch(() => {});
      }

      clearAuthNextCookieClient();
      clearAuthEmailCookie();
      if (cancelled) return;
      setMessage("Inloggad — skickar dig vidare…");
      router.replace(next);
      router.refresh();
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function AuthPkcePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loggar in…
        </div>
      }
    >
      <AuthPkceClient />
    </Suspense>
  );
}
