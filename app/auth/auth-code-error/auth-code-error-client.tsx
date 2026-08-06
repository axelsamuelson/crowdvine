"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AUTH_EMAIL_COOKIE,
  clearAuthEmailCookie,
  clearAuthNextCookieClient,
  readAuthCookie,
  setAuthEmailCookie,
  setAuthNextCookie,
} from "@/lib/auth/auth-flow-cookies";
import { claimOnce } from "@/lib/analytics/emit-once";
import {
  getSupabaseBrowserClient,
  prepareFreshBrowserAuth,
} from "@/lib/supabase/client";

const RESEND_COOLDOWN_MS = 60_000;

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/checkout";
}

function otpResentKey(email: string): string {
  return `otp_resent:${email.trim().toLowerCase()}`;
}

function cooldownStorageKey(email: string): string {
  return `otp_resend_cooldown:${email.trim().toLowerCase()}`;
}

function isRateLimitError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many") ||
    m.includes("over_email_send_rate_limit") ||
    m.includes("email rate") ||
    m.includes("429")
  );
}

function readCooldownRemainingSec(email: string): number {
  if (typeof window === "undefined" || !email.includes("@")) return 0;
  try {
    const raw = sessionStorage.getItem(cooldownStorageKey(email));
    const endsAt = raw ? Number(raw) : 0;
    if (!Number.isFinite(endsAt) || endsAt <= Date.now()) return 0;
    return Math.ceil((endsAt - Date.now()) / 1000);
  } catch {
    return 0;
  }
}

function startCooldown(email: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      cooldownStorageKey(email),
      String(Date.now() + RESEND_COOLDOWN_MS),
    );
  } catch {
    // ignore
  }
}

/**
 * Magic-link PKCE failed (wrong browser, mail scanner, missing verifier, …).
 *
 * The link already consumed the shared single-use OTP token, so the 6-digit
 * code from THAT email is dead. We automatically send a NEW OTP once
 * (emitOnce / sessionStorage) and collect the fresh code here.
 */
export default function AuthCodeErrorClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "verifying" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(0);

  const refreshCooldown = useCallback((forEmail: string) => {
    setCooldownSec(readCooldownRemainingSec(forEmail));
  }, []);

  useEffect(() => {
    if (cooldownSec <= 0) return;
    const t = window.setInterval(() => {
      setCooldownSec((prev) => {
        const nextSec = Math.max(0, prev - 1);
        return nextSec;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldownSec]);

  const sendNewOtp = useCallback(
    async (toEmail: string, opts?: { manual?: boolean }) => {
      const trimmed = toEmail.trim().toLowerCase();
      if (!trimmed.includes("@")) {
        setError("Ange en giltig e-postadress.");
        setStatus("error");
        return;
      }

      if (opts?.manual && readCooldownRemainingSec(trimmed) > 0) {
        refreshCooldown(trimmed);
        return;
      }

      setStatus("sending");
      setError(null);
      setInfo(null);
      try {
        const supabase = await prepareFreshBrowserAuth();
        setAuthNextCookie(next);
        setAuthEmailCookie(trimmed);
        const origin = window.location.origin;
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
            shouldCreateUser: true,
          },
        });
        if (otpErr) {
          const msg = otpErr.message || "";
          setError(
            isRateLimitError(msg)
              ? "För många försök. Vänta en stund och försök igen."
              : msg,
          );
          setStatus("error");
          return;
        }
        setEmail(trimmed);
        setStatus("sent");
        setInfo(
          "Vi har skickat en ny kod till din e-post. Ange den nedan.",
        );
        startCooldown(trimmed);
        refreshCooldown(trimmed);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Kunde inte skicka ny kod";
        setError(
          isRateLimitError(msg)
            ? "För många försök. Vänta en stund och försök igen."
            : msg,
        );
        setStatus("error");
      }
    },
    [next, refreshCooldown],
  );

  // Auto-resend exactly once per email (survives reloads via sessionStorage).
  useEffect(() => {
    const fromQuery = searchParams.get("email")?.trim() ?? "";
    const fromCookie = readAuthCookie(AUTH_EMAIL_COOKIE)?.trim() ?? "";
    const resolved = (fromQuery || fromCookie).toLowerCase();
    if (!resolved.includes("@")) {
      setStatus("idle");
      return;
    }

    setEmail(resolved);
    refreshCooldown(resolved);

    const firstAuto = claimOnce(otpResentKey(resolved));
    if (firstAuto) {
      void sendNewOtp(resolved, { manual: false });
      return;
    }

    // Already auto-sent this session — show code UI + manual resend only.
    setStatus("sent");
    setInfo(
      "Vi har skickat en ny kod till din e-post. Ange den nedan.",
    );
  }, [searchParams, sendNewOtp, refreshCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    const token = otp.trim().replace(/\s+/g, "");
    if (!trimmedEmail || token.length < 6) return;
    setStatus("verifying");
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
        setStatus("sent");
        return;
      }
      if (data.user?.id) {
        await fetch("/api/auth/finalize-signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            source: "checkout_otp",
            emit_signup_completed: true,
          }),
        }).catch(() => {});
      }
      clearAuthNextCookieClient();
      clearAuthEmailCookie();
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte verifiera koden",
      );
      setStatus("sent");
    }
  };

  const resendDisabled =
    status === "sending" || status === "verifying" || cooldownSec > 0;

  const resendLabel =
    cooldownSec > 0
      ? `Skicka ny kod (${cooldownSec}s)`
      : "Skicka ny kod";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold">
              Inloggningslänken fungerade inte
            </CardTitle>
            <CardDescription>
              Länken kan ha öppnats i fel webbläsare, redan använts, eller
              förbrukats av en e-postscanner. Den gamla 6-siffriga koden från
              samma mail fungerar då inte heller — vi skickar en ny.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {info ? (
              <p className="text-sm text-foreground text-center font-medium">
                {info}
              </p>
            ) : null}
            {status === "sending" ? (
              <p className="text-sm text-muted-foreground text-center">
                Skickar ny kod…
              </p>
            ) : null}

            {!email.includes("@") || status === "idle" || status === "error" ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  // First send for this email claims auto key so reloads won't double-send.
                  claimOnce(otpResentKey(email));
                  void sendNewOtp(email, { manual: true });
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="auth-error-email">E-post</Label>
                  <Input
                    id="auth-error-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    required
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={resendDisabled}
                >
                  {resendLabel}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  Kod skickad till {email}
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="auth-error-otp">6-siffrig kod</Label>
                  <Input
                    id="auth-error-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(ev) => setOtp(ev.target.value)}
                    placeholder="123456"
                    maxLength={8}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full bg-black text-white hover:bg-black/90"
                  disabled={status === "verifying" || otp.trim().length < 6}
                >
                  {status === "verifying" ? "Verifierar…" : "Verifiera"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={resendDisabled}
                  onClick={() => void sendNewOtp(email, { manual: true })}
                >
                  {resendLabel}
                </Button>
              </form>
            )}

            <div className="space-y-2 pt-2">
              <Button
                variant="outline"
                onClick={() => router.push(next)}
                className="w-full"
              >
                Tillbaka till kassan
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/log-in">Till inloggning</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
