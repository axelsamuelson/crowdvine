"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  emailHint: string;
  checkInbox: string;
  emailLabel: string;
  sendLinkLabel: string;
  onAuthenticated: () => void;
};

/**
 * Mid-checkout magic-link signup when PLATFORM_OPEN and user is anonymous.
 */
export function CheckoutEmailAuth({
  emailHint,
  checkInbox,
  emailLabel,
  sendLinkLabel,
  onAuthenticated,
}: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFieldRef = useRef("email");
  const completedRef = useRef(false);
  const emailEnteredRef = useRef(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "signup_started",
      eventCategory: "auth",
      metadata: { source: "checkout" },
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        completedRef.current = true;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/checkout")}`,
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

  return (
    <div className="space-y-3 rounded-md border border-border bg-background p-4">
      <p className="text-sm text-muted-foreground">{emailHint}</p>
      {sent ? (
        <p className="text-sm font-medium text-foreground">{checkInbox}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
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
