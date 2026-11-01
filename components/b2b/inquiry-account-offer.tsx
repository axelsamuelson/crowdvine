"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getSupabaseBrowserClient,
  prepareFreshBrowserAuth,
} from "@/lib/supabase/client";
import {
  setAuthEmailCookie,
  setAuthNextCookie,
} from "@/lib/auth/auth-flow-cookies";
import {
  b2bInquiryAccountLoginHref,
  b2bInquiryClaimReturnHref,
  clearB2bInquiryClaimToken,
  readB2bInquiryClaimToken,
} from "@/lib/b2b/inquiry-claim-client";
import type { B2bInquiryCopyLocale } from "@/lib/b2b/inquiry-copy";
import { b2bInquiryCopy } from "@/lib/b2b/inquiry-copy";

async function claimStoredInquiry(): Promise<boolean> {
  const token = readB2bInquiryClaimToken();
  if (!token) return false;
  const res = await fetch("/api/b2b/inquiry/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
  });
  if (res.ok) {
    clearB2bInquiryClaimToken();
    return true;
  }
  return false;
}

/**
 * Optional post-submit account creation for guest Dirtywine inquiries.
 * Uses email OTP (creates account without invite membership messaging).
 */
export function InquiryAccountOffer({
  emailHint,
  locale,
  onSkip,
  onLinked,
}: {
  emailHint: string;
  locale: B2bInquiryCopyLocale;
  onSkip: () => void;
  onLinked: () => void;
}) {
  const copy = b2bInquiryCopy(locale);
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState(emailHint);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finishLinked = async () => {
    await claimStoredInquiry();
    try {
      await fetch("/api/auth/finalize-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          source: "checkout_otp",
          emit_signup_completed: true,
        }),
      });
    } catch {
      // non-fatal
    }
    onLinked();
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError(copy.validationEmail);
      return;
    }
    setSending(true);
    setError(null);
    try {
      const supabase = await prepareFreshBrowserAuth();
      const origin = window.location.origin;
      const returnPath = b2bInquiryClaimReturnHref();
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
      setError(err instanceof Error ? err.message : copy.genericError);
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
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token,
        type: "email",
      });
      if (verifyErr) {
        setError(verifyErr.message);
        return;
      }
      await finishLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.genericError);
    } finally {
      setVerifying(false);
    }
  };

  if (!expanded) {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          className="w-full h-12 font-sans"
          onClick={() => setExpanded(true)}
        >
          {copy.createAccountCta}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full font-sans"
          onClick={onSkip}
        >
          {copy.createAccountSkip}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href={b2bInquiryAccountLoginHref(emailHint)}
            className="underline underline-offset-2"
          >
            {copy.loginExistingCta}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-border p-4 font-sans">
      <p className="text-sm font-medium text-foreground">
        {copy.createAccountCta}
      </p>
      {sent ? (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {locale === "sv"
              ? "Ange den 6-siffriga koden från mejlet."
              : "Enter the 6-digit code from the email."}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="inquiry-otp-code">
              {locale === "sv" ? "Kod" : "Code"}
            </Label>
            <Input
              id="inquiry-otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(ev) => setOtp(ev.target.value)}
              maxLength={8}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={verifying || otp.trim().length < 6}
            className="w-full h-12"
          >
            {verifying
              ? locale === "sv"
                ? "Verifierar…"
                : "Verifying…"
              : locale === "sv"
                ? "Verifiera"
                : "Verify"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSendLink} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="inquiry-otp-email">{copy.emailLabel}</Label>
            <Input
              id="inquiry-otp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={sending} className="w-full h-12">
            {sending
              ? copy.submitting
              : locale === "sv"
                ? "Skicka inloggningslänk"
                : "Send login link"}
          </Button>
        </form>
      )}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={onSkip}
      >
        {copy.createAccountSkip}
      </Button>
    </div>
  );
}
