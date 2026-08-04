"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import {
  claimOnce,
  claimSignupCompletedOnce,
  clearClaim,
  SIGNUP_STARTED_CHECKOUT_KEY,
} from "@/lib/analytics/once-per-session";
import {
  getSupabaseBrowserClient,
  prepareFreshBrowserAuth,
} from "@/lib/supabase/client";

type Props = {
  emailHint: string;
  checkInbox: string;
  emailLabel: string;
  sendLinkLabel: string;
  onAuthenticated: () => void;
};

const AUTH_NEXT_COOKIE = "cv_auth_next";

function setAuthNextCookie(path: string) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${AUTH_NEXT_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=3600; SameSite=Lax${secure}`;
}

async function emitSignupCompleted(userId: string, source: string) {
  if (!claimSignupCompletedOnce(userId)) return;
  clearClaim(SIGNUP_STARTED_CHECKOUT_KEY);
  await AnalyticsTracker.trackEvent({
    eventType: "signup_completed",
    eventCategory: "auth",
    metadata: { source, user_id: userId },
  });
}

/**
 * Mid-checkout magic-link / OTP signup when user is anonymous.
 */
export function CheckoutEmailAuth({
  emailHint,
  checkInbox,
  emailLabel,
  sendLinkLabel,
  onAuthenticated,
}: Props) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFieldRef = useRef("email");
  const completedRef = useRef(false);
  const emailEnteredRef = useRef(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        // Already authenticated → never fire signup_started.
        if (user?.id) return;
      } catch {
        // proceed as anonymous
      }
      if (!claimOnce(SIGNUP_STARTED_CHECKOUT_KEY)) return;
      void AnalyticsTracker.trackEvent({
        eventType: "signup_started",
        eventCategory: "auth",
        metadata: { source: "checkout" },
      });
    })();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        completedRef.current = true;
        if (event === "SIGNED_IN") {
          void emitSignupCompleted(session.user.id, "checkout");
        }
        onAuthenticated();
      }
    });
    return () => {
      subscription.unsubscribe();
      if (emailEnteredRef.current && !completedRef.current) {
        void AnalyticsTracker.trackEvent({
          eventType: "signup_abandoned",
          eventCategory: "auth",
          metadata: { last_field: lastFieldRef.current },
        });
      }
    };
  }, [onAuthenticated]);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      // Fresh client so PKCE code-verifier is written after any prior signOut.
      const supabase = await prepareFreshBrowserAuth();
      const origin = window.location.origin;
      const returnPath = "/checkout";
      setAuthNextCookie(returnPath);
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(returnPath)}`,
          shouldCreateUser: true,
        },
      });
      if (otpErr) {
        setError(otpErr.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte skicka länk");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const token = otp.trim().replace(/\s+/g, "");
    if (!trimmedEmail || !token) return;
    setVerifying(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "email",
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }
      completedRef.current = true;
      const userId = data.user?.id;
      if (userId) {
        await emitSignupCompleted(userId, "checkout_otp");
      }
      onAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte verifiera koden");
    } finally {
      setVerifying(false);
    }
  };

  const isLocalhost =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.hostname);

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{emailHint}</p>
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{checkInbox}</p>
          {isLocalhost ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Lokal test: länken måste öppna{" "}
              <span className="font-mono">localhost:3000</span>, inte
              pactwines.com. Lägg till{" "}
              <span className="font-mono">http://localhost:3000/**</span> under
              Supabase → Authentication → URL Configuration → Redirect URLs.
              Annars: ange 6-siffrig kod från mailet nedan (kräver{" "}
              <span className="font-mono">{"{{ .Token }}"}</span> i
              e-postmallen).
            </p>
          ) : null}
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-otp-code">Kod från mailet</Label>
              <Input
                id="checkout-otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onFocus={() => {
                  lastFieldRef.current = "otp";
                }}
                onChange={(ev) => setOtp(ev.target.value)}
                placeholder="123456"
                maxLength={8}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              disabled={verifying || otp.trim().length < 6}
              className="w-full bg-black text-white hover:bg-black/90"
            >
              {verifying ? "Verifierar…" : "Verifiera kod"}
            </Button>
          </form>
          <button
            type="button"
            className="text-xs underline underline-offset-2 text-muted-foreground"
            onClick={() => {
              setSent(false);
              setOtp("");
              setError(null);
            }}
          >
            Skicka igen
          </button>
        </div>
      ) : (
        <form onSubmit={handleSendLink} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-otp-email">{emailLabel}</Label>
            <Input
              id="checkout-otp-email"
              type="email"
              autoComplete="email"
              value={email}
              onFocus={() => {
                lastFieldRef.current = "email";
              }}
              onChange={(ev) => {
                setEmail(ev.target.value);
                if (ev.target.value.trim()) emailEnteredRef.current = true;
              }}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            disabled={sending}
            className="w-full bg-black text-white hover:bg-black/90"
          >
            {sendLinkLabel}
          </Button>
        </form>
      )}
    </div>
  );
}
