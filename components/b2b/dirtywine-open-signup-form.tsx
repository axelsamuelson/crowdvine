"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, User } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  b2bOpenSignupCopy,
  sanitizeOpenSignupNext,
  type B2bOpenSignupLocale,
} from "@/lib/b2b/open-signup";

export function DirtywineOpenSignupForm({
  nextPath,
  locale = "sv",
  initialEmail = "",
}: {
  nextPath?: string | null;
  locale?: B2bOpenSignupLocale;
  initialEmail?: string;
}) {
  const copy = b2bOpenSignupCopy(locale);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const loginHref = (() => {
    const next = sanitizeOpenSignupNext(nextPath);
    return next
      ? `/log-in?next=${encodeURIComponent(next)}`
      : "/log-in";
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (password !== confirmPassword) {
      setError(copy.passwordMismatch);
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

      if (data.autoSignedIn && data.session?.access_token) {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      setSuccess(true);
      const destination = sanitizeOpenSignupNext(nextPath) || "/";
      window.setTimeout(() => {
        window.location.href = destination;
      }, 400);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.genericError);
    } finally {
      setLoading(false);
    }
  };

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
              autoComplete="organization name"
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
              minLength={6}
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
              minLength={6}
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

        {success ? (
          <Alert className="border-green-200 bg-green-50 text-green-900">
            <AlertDescription>{copy.success}</AlertDescription>
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
