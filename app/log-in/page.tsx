"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Get next parameter from URL
  const [nextUrl, setNextUrl] = useState("/profile");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get("next");
    if (next) {
      setNextUrl(next);
    }
  }, []);

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
          throw new Error(data.error || "Failed to reset password");
        }

        setSuccess(data.message);
        if (data.newPassword) {
          setSuccess(
            `${data.message} Your new password is: ${data.newPassword}`,
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
          throw new Error(data.error || "Invalid email or password");
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

        setSuccess("Login successful! Redirecting...");
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
            ? "Failed to reset password. Please try again."
            : "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <InfiniteGallery
        images={galleryImages}
        speed={1.2}
        zSpacing={3}
        visibleCount={12}
        falloff={{ near: 0.8, far: 14 }}
        className="h-[100dvh] w-full rounded-lg overflow-hidden"
      />

      {/* Center overlay (same style as /access-request) */}
      <div className="h-[100dvh] inset-0 pointer-events-none fixed flex items-center justify-center text-center px-3 mix-blend-exclusion text-white">
        <div className="pointer-events-auto flex flex-col items-center justify-center w-full max-w-md gap-6">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION, ease: EASE_OUT }}
            className="flex justify-center"
          >
            <FooterLogoSvg className="h-16 sm:h-20 lg:h-24 w-auto text-white" />
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: DURATION, ease: EASE_OUT, delay: DELAY }}
            className="w-full"
          >
            <Card className="backdrop-blur-xl border-2 border-white/20 bg-white/10">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-semibold text-white">
                  {isForgotPassword ? "Reset your password" : "Welcome back"}
                </CardTitle>
                <p className="text-white/80 text-sm mt-2">
                  {isForgotPassword
                    ? "Enter your email to receive a new password"
                    : "Enter your credentials to access your account"}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-white/90 text-sm font-medium"
                    >
                      Email address
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
                        className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50"
                        placeholder="Enter your email"
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
                          Password
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
                            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/50 focus:bg-white/30 focus:border-white/50"
                            placeholder="Enter your password"
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
                      "w-full bg-white/20 hover:bg-white/30 border-white/30 text-white font-semibold",
                      "backdrop-blur-sm shadow-lg",
                      "transition-all duration-300 ease-out",
                    )}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isForgotPassword
                          ? "Resetting password..."
                          : "Signing in..."}
                      </>
                    ) : isForgotPassword ? (
                      "Reset password"
                    ) : (
                      "Sign in"
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
                          className="w-full bg-transparent border-white/30 text-white hover:bg-white/20"
                        >
                          Forgot password?
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
                          className="w-full bg-transparent border-white/30 text-white hover:bg-white/20"
                        >
                          Back to sign in
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
                    Back to home
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Bottom instructions (template style) */}
      <div className="text-center fixed bottom-10 left-0 right-0 font-mono uppercase text-[11px] font-semibold text-white/90 mix-blend-exclusion">
        <p>Wine, but not like this.</p>
        <p className="opacity-60">Membership by invitation.</p>
      </div>
    </main>
  );
}
