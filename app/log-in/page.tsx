"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Loader2, Mail, Lock, ArrowLeft } from "lucide-react";
import { FooterLogoSvg } from "@/components/layout/footer-logo-svg";
import InfiniteGallery from "@/components/access-request/infinite-gallery";
import { galleryImages } from "@/components/access-request/gallery-images";
import { useTranslations } from "@/lib/hooks/use-translations";
import {
  b2bOpenSignupCopy,
  b2bOpenSignupHref,
  isExactDirtywineOpenSignupHost,
} from "@/lib/b2b/open-signup";

const DURATION = 0.3;
const DELAY = DURATION;
const EASE_OUT = "easeOut";
const EASE_OUT_OPACITY = [0.25, 0.46, 0.45, 0.94] as const;
const SPRING = {
  type: "spring" as const,
  stiffness: 60,
  damping: 10,
  mass: 0.8,
};

export default function LogInPage() {
  const { t } = useTranslations();
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get next parameter from URL
  const [nextUrl, setNextUrl] = useState("/profile");
  /**
   * Dirty Wine: replace invite-membership footer with open sign-up CTA.
   * PACT keeps “Medlemskap via inbjudan.”
   */
  const [showDirtywineOpenSignup, setShowDirtywineOpenSignup] =
    useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get("next");
    if (next) {
      setNextUrl(next);
    }
    const emailParam = urlParams.get("email")?.trim();
    if (emailParam) {
      setEmail(emailParam);
    }
    setShowDirtywineOpenSignup(
      isExactDirtywineOpenSignupHost(window.location.hostname, urlParams),
    );
  }, []);

  const openSignupCopy = b2bOpenSignupCopy("sv");
  const openSignupHref = b2bOpenSignupHref(
    nextUrl && nextUrl !== "/profile" ? nextUrl : null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isForgotPassword) {
        // Password reset
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t("auth.resetFailed"));
        }

        setSuccess(data.message);
        if (data.newPassword) {
          setSuccess(
            `${data.message} ${data.newPassword}`,
          );
        }
        setEmail("");
        setIsForgotPassword(false);
      } else {
        // Real login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || t("auth.invalidCredentials"));
        }

        // Track login event
        try {
          const { AnalyticsTracker } = await import("@/lib/analytics/event-tracker");
          await AnalyticsTracker.trackEvent({
            eventType: "user_first_login",
            eventCategory: "auth",
            metadata: { email },
          });
        } catch (trackingError) {
          console.error("Failed to track login event:", trackingError);
        }

        setSuccess(t("auth.loginSuccess"));
        setEmail("");
        setPassword("");

        // Redirect using Next.js router to the intended destination
        // Use window.location.href to ensure cookies are properly set before redirect
        setTimeout(() => {
          window.location.href = nextUrl;
        }, 500);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isForgotPassword
            ? t("auth.resetFailed")
            : t("auth.invalidCredentials"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      {/* Dirty Wine open signup: solid backdrop (no gallery) so images cannot
          stray over / beside the Skapa konto block. PACT keeps the gallery. */}
      {showDirtywineOpenSignup ? (
        <div
          aria-hidden
          className="fixed inset-0 bg-[hsl(223.81_0%_22%)]"
        />
      ) : (
        <InfiniteGallery
          images={galleryImages}
          speed={1.2}
          zSpacing={3}
          visibleCount={12}
          falloff={{ near: 0.8, far: 14 }}
          className="h-[100dvh] w-full rounded-lg overflow-hidden"
        />
      )}

      {/* Center overlay — z-20 above backdrop/gallery. */}
      <div className="h-[100dvh] inset-0 pointer-events-none fixed z-20 flex items-center justify-center text-center px-3 text-white overflow-y-auto py-8">
        <div className="pointer-events-auto flex flex-col items-center justify-center w-full max-w-md gap-6 my-auto">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION, ease: EASE_OUT }}
            className="flex justify-center drop-shadow-[0_2px_16px_rgba(0,0,0,0.85)]"
          >
            <FooterLogoSvg className="h-16 sm:h-20 lg:h-24 w-auto text-white" />
          </motion.div>

          {/* Login Card — exclusion on the backdrop only, form stays readable */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION, ease: EASE_OUT, delay: DELAY }}
            className="relative w-full"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl bg-white mix-blend-exclusion"
            />
            <Card className="relative isolate border-2 border-white/25 bg-zinc-950/50 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-semibold text-white">
                  {isForgotPassword
                    ? t("auth.resetPasswordTitle")
                    : t("auth.welcomeBack")}
                </CardTitle>
                <p className="text-white/80 text-sm mt-2">
                  {isForgotPassword
                    ? t("auth.resetHint")
                    : t("auth.credentialsHint")}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-white/90 text-sm font-medium"
                    >
                      {t("auth.emailLabel")}
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:bg-black/55 focus:border-white/40"
                        placeholder={t("auth.emailPlaceholder")}
                      />
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {!isForgotPassword && (
                      <motion.div
                        key="password"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                        className="space-y-2"
                      >
                        <Label
                          htmlFor="password"
                          className="text-white/90 text-sm font-medium"
                        >
                          {t("auth.passwordLabel")}
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pl-10 bg-black/40 border-white/20 text-white placeholder:text-white/45 focus:bg-black/55 focus:border-white/40"
                            placeholder={t("auth.passwordPlaceholder")}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                      >
                        <Alert
                          variant="destructive"
                          className="bg-red-500/20 border-red-500/50"
                        >
                          <AlertDescription className="text-red-100">
                            {error}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                      >
                        <Alert className="bg-green-500/20 border-green-500/50">
                          <AlertDescription className="text-green-100">
                            {success}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full bg-white text-zinc-950 hover:bg-white/90 font-semibold",
                      "shadow-lg",
                      "transition-all duration-300 ease-out",
                    )}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isForgotPassword
                          ? t("auth.resettingPassword")
                          : t("auth.signingIn")}
                      </>
                    ) : isForgotPassword ? (
                      t("auth.resetPassword")
                    ) : (
                      t("auth.signIn")
                    )}
                  </Button>
                </form>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4 border-t border-white/20">
                  <AnimatePresence mode="wait">
                    {!isForgotPassword && (
                      <motion.div
                        key="forgot-password-toggle"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                      >
                        <Button
                          onClick={() => {
                            setIsForgotPassword(!isForgotPassword);
                            setError("");
                            setSuccess("");
                            setEmail("");
                            setPassword("");
                          }}
                          variant="outline"
                          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/15"
                        >
                          {t("auth.forgotPassword")}
                        </Button>
                      </motion.div>
                    )}

                    {isForgotPassword && (
                      <motion.div
                        key="back-to-signin"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: DURATION, ease: EASE_OUT }}
                      >
                        <Button
                          onClick={() => {
                            setIsForgotPassword(false);
                            setError("");
                            setSuccess("");
                            setEmail("");
                            setPassword("");
                          }}
                          variant="outline"
                          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/15"
                        >
                          {t("auth.backToSignIn")}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Back to Home */}
                <div className="text-center pt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center text-white/70 hover:text-white text-sm transition-colors duration-200"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {t("auth.backToHome")}
                  </Link>
                </div>

                {/* Dirty Wine: open sign-up inside the card so gallery cannot show through gaps. */}
                {showDirtywineOpenSignup ? (
                  <div className="mt-6 pt-5 border-t border-white/20 space-y-2 text-center">
                    <p className="text-base font-semibold tracking-tight text-white">
                      {openSignupCopy.heading}
                    </p>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {openSignupCopy.body}
                    </p>
                    <Link
                      href={openSignupHref}
                      className={cn(
                        buttonVariants({ size: "default" }),
                        "mt-2 inline-flex h-10 w-full bg-white text-zinc-950 hover:bg-white/90 font-semibold",
                      )}
                    >
                      {openSignupCopy.cta}
                    </Link>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* PACT only: invite membership footer. */}
      {!showDirtywineOpenSignup ? (
        <div className="text-center fixed bottom-10 left-0 right-0 z-20 font-sans uppercase tracking-[0.04em] text-[11px] font-semibold text-white/90 mix-blend-exclusion">
          <p>{t("auth.footerLine1")}</p>
          <p className="opacity-60">{t("auth.footerLine2")}</p>
        </div>
      ) : null}
    </main>
  );
}
