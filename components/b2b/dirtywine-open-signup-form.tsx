"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { B2B_INQUIRY_GUEST_PATH } from "@/lib/b2b/inquiry-login";
import {
  B2B_OPEN_SIGNUP_MIN_PASSWORD,
  b2bOpenSignupCopy,
  sanitizeOpenSignupNext,
  type B2bOpenSignupLocale,
} from "@/lib/b2b/open-signup";

export function DirtywineOpenSignupForm({
  nextPath,
  locale = "sv",
  initialEmail = "",
  /** Design-review / QA: start on the post-submit “Kolla din mejl” state. */
  initialCheckEmail = false,
}: {
  nextPath?: string | null;
  locale?: B2bOpenSignupLocale;
  initialEmail?: string;
  initialCheckEmail?: boolean;
}) {
  const copy = b2bOpenSignupCopy(locale);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(initialCheckEmail);

  const safeNext = sanitizeOpenSignupNext(nextPath);
  const loginHref = safeNext
    ? `/log-in?next=${encodeURIComponent(safeNext)}`
    : "/log-in";
  const guestHref = B2B_INQUIRY_GUEST_PATH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
      return;
    }
    if (password.length < B2B_OPEN_SIGNUP_MIN_PASSWORD) {
      setError(copy.passwordTooShort);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/b2b-open-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          next: safeNext || "/",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : copy.genericError,
        );
      }

      // Email confirmation required — do not auto-redirect; show check-email state.
      setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.genericError);
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div
        className="w-full max-w-md mx-auto space-y-6 text-center"
        data-testid="dirtywine-open-signup-check-email"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
          <Mail className="h-6 w-6 text-foreground" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {copy.checkEmailHeading}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {copy.checkEmailBody}
          </p>
          {email ? (
            <p className="text-sm font-medium text-foreground break-all">
              {email}
            </p>
          ) : null}
        </div>
        <div className="space-y-3 pt-2">
          <Button asChild className="w-full h-12" size="lg">
            <Link href={guestHref}>{copy.checkEmailContinueGuest}</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            {copy.alreadyHaveAccount}{" "}
            <Link
              href={loginHref}
              className="text-foreground underline underline-offset-2"
            >
              {copy.signIn}
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {copy.heading}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {copy.body}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">{copy.nameLabel}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10"
              placeholder={copy.namePlaceholder}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{copy.emailLabel}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              placeholder={copy.emailPlaceholder}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{copy.passwordLabel}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={B2B_OPEN_SIGNUP_MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              placeholder={copy.passwordPlaceholder}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{copy.confirmPasswordLabel}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={B2B_OPEN_SIGNUP_MIN_PASSWORD}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10"
              placeholder={copy.confirmPasswordPlaceholder}
            />
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full h-12" disabled={loading} size="lg">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {copy.alreadyHaveAccount}{" "}
        <Link href={loginHref} className="text-foreground underline underline-offset-2">
          {copy.signIn}
        </Link>
      </p>
    </div>
  );
}
