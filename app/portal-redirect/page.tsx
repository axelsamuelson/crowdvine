"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Sparkles } from "lucide-react";
import { FooterLogoSvg } from "@/components/layout/footer-logo-svg";

const REDIRECT_DELAY_MS = 2500;

function PortalRedirectContent() {
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(
    Math.ceil(REDIRECT_DELAY_MS / 1000),
  );

  const from = searchParams.get("from") || "dirtywine";
  const rawNext = searchParams.get("next") || "/";
  const next = rawNext.startsWith("/") ? rawNext : `/${rawNext}`;

  // Set cookie on dirtywine.se when viewing this page (cross-origin request)
  // Uses img to trigger GET - cookie set by dirtywine.se response
  useEffect(() => {
    if (from === "dirtywine") {
      const url = `https://dirtywine.se/api/set-portal-cookie?next=${encodeURIComponent(next)}&silent=1`;
      const img = new Image();
      img.src = url;
    }
  }, [from, next]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.href = next.startsWith("/") ? next : `/${next}`;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [next]);

  const isFromDirtywine = from === "dirtywine";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-stone-50 to-stone-100">
      <Card className="max-w-md w-full border-stone-200/80 shadow-xl shadow-stone-200/50 overflow-hidden">
        <CardContent className="pt-10 pb-10 px-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-stone-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-100" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl font-light text-center text-stone-900 mb-2 tracking-tight">
            {isFromDirtywine
              ? "Dirty Wine is for business members"
              : "Portal redirect"}
          </h1>

          {/* Message */}
          <p className="text-sm text-stone-600 text-center mb-8 leading-relaxed">
            {isFromDirtywine ? (
              <>
                Your account is set up for PACT Wines. Taking you to
                pactwines.com.
              </>
            ) : (
              <>Redirecting you to the right place.</>
            )}
          </p>

          {/* Redirect indicator */}
          <div className="flex items-center justify-center gap-2 text-stone-500 text-sm">
            <ArrowRight className="w-4 h-4 animate-pulse" />
            <span>
              Redirecting in {countdown} second{countdown !== 1 ? "s" : ""}…
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <div className="mt-10 opacity-60">
        <FooterLogoSvg className="h-10 w-auto text-stone-700" />
      </div>
    </div>
  );
}

export default function PortalRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="animate-pulse text-stone-400">Loading…</div>
        </div>
      }
    >
      <PortalRedirectContent />
    </Suspense>
  );
}
