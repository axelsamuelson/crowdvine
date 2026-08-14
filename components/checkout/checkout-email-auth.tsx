"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import {
  claimSignupCompletedOnce,
  clearClaim,
  emitOnce,
  SIGNUP_STARTED_CHECKOUT_KEY,
} from "@/lib/analytics/once-per-session";
import {
  getSupabaseBrowserClient,
  prepareFreshBrowserAuth,
} from "@/lib/supabase/client";
import {
  setAuthEmailCookie,
  setAuthNextCookie,
} from "@/lib/auth/auth-flow-cookies";

type Props = {
  emailHint: string;
  checkInbox: string;
  emailLabel: string;
  sendLinkLabel: string;
  onAuthenticated: () => void;
};

async function finalizeClientSignup(source: string) {
  await fetch("/api/auth/finalize-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      source,
      emit_signup_completed: true,
    }),
  }).catch(() => {});
}

/**
 * Mid-checkout magic-link / OTP signup when user is anonymous.
 *
 * IMPORTANT — shared single-use OTP token:
 * signInWithOtp emails ONE token used by BOTH the magic link and the 6-digit
 * code. Clicking the link consumes that token at Supabase before PKCE returns
 * here. If the link fails (wrong browser / PKCE), the code from that email is
 * already burned — request a new OTP (see /auth/auth-code-error).
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
  const notifiedRef = useRef(false);
  const emailEnteredRef = useRef(false);
  const shownRef = useRef(false);
  const finalizedRef = useRef(false);

  const notifyAuthenticated = () => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    onAuthenticated();
  };

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.id) return;
      } catch {
        // proceed as anonymous
      }
      emitOnce(SIGNUP_STARTED_CHECKOUT_KEY, () => {
        void AnalyticsTracker.trackEvent({
          eventType: "auth_email_step_shown",
          eventCategory: "auth",
          metadata: { source: "checkout" },
        });
      });
    })();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && event === "SIGNED_IN") {
        completedRef.current = true;
        if (!finalizedRef.current) {
          finalizedRef.current = true;
          if (claimSignupCompletedOnce(session.user.id)) {
            clearClaim(SIGNUP_STARTED_CHECKOUT_KEY);
          }
          void finalizeClientSignup("checkout");
        }
        notifyAuthenticated();
      }
    });
    return () => {
      subscription.unsubscribe();
      if (emailEnteredRef.current && !completedRef.current) {
        void AnalyticsTracker.trackEvent({
          eventType: "auth_email_step_abandoned",
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
      const supabase = await prepareFreshBrowserAuth();
      const origin = window.location.origin;
      const returnPath = "/checkout";
      setAuthNextCookie(returnPath);
      setAuthEmailCookie(trimmed);
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
        if (!finalizedRef.current) {
          finalizedRef.current = true;
          claimSignupCompletedOnce(userId);
          clearClaim(SIGNUP_STARTED_CHECKOUT_KEY);
          await finalizeClientSignup("checkout_otp");
        }
      }
      notifyAuthenticated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte verifiera koden");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{emailHint}</p>
      {sent ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">{checkInbox}</p>
          <p className="text-sm text-muted-foreground">
            Fick du ingen länk att fungera? Ange den 6-siffriga koden från
            mailet.
          </p>
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-otp-code">6-siffrig kod</Label>
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
              {verifying ? "Verifierar…" : "Verifiera"}
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
