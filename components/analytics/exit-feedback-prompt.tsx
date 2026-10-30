"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useCartOptional } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getExitFeedbackSessionId,
  hasCheckoutStartedInSession,
  hasShownExitFeedback,
  isInternalExitFeedbackSession,
  markExitFeedbackShown,
  resolveExitFeedbackStep,
  type ExitFeedbackStep,
  EXIT_FEEDBACK_ANSWER_MAX,
} from "@/lib/analytics/exit-feedback";

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Standalone exit-intent / abandoned-cart feedback.
 * Mounted from root layout — does not touch checkout-client or other CRO files.
 * Reads checkout_started via sessionStorage and cart via CartProvider.
 */
export function ExitFeedbackPrompt() {
  const pathname = usePathname() ?? "/";
  const cartCtx = useCartOptional();
  const cartHasItems = (cartCtx?.cart?.totalQuantity ?? 0) > 0;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ExitFeedbackStep | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageAtOpen, setPageAtOpen] = useState("/");

  const openRef = useRef(false);
  const mobilePendingRef = useRef(false);
  const cartHasItemsRef = useRef(cartHasItems);
  cartHasItemsRef.current = cartHasItems;
  openRef.current = open;

  const tryOpen = useCallback(() => {
    if (openRef.current || hasShownExitFeedback()) return;

    const resolved = resolveExitFeedbackStep({
      checkoutStarted: hasCheckoutStartedInSession(),
      cartHasItems: cartHasItemsRef.current,
    });
    if (!resolved) return;

    markExitFeedbackShown();
    setStep(resolved);
    setPageAtOpen(
      typeof window !== "undefined" ? window.location.pathname || pathname : pathname,
    );
    setOpen(true);
    openRef.current = true;
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    openRef.current = false;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onMouseOut = (event: MouseEvent) => {
      if (isCoarsePointer()) return;
      if (event.relatedTarget != null) return;
      if (event.clientY > 0) return;
      tryOpen();
    };

    const onVisibility = () => {
      if (!isCoarsePointer() && !/Mobi|Android/i.test(navigator.userAgent)) {
        return;
      }
      if (document.visibilityState === "hidden") {
        const resolved = resolveExitFeedbackStep({
          checkoutStarted: hasCheckoutStartedInSession(),
          cartHasItems: cartHasItemsRef.current,
        });
        if (resolved && !hasShownExitFeedback()) {
          mobilePendingRef.current = true;
        }
        return;
      }
      if (
        document.visibilityState === "visible" &&
        mobilePendingRef.current
      ) {
        mobilePendingRef.current = false;
        tryOpen();
      }
    };

    const onPageHide = () => {
      if (!isCoarsePointer() && !/Mobi|Android/i.test(navigator.userAgent)) {
        return;
      }
      const resolved = resolveExitFeedbackStep({
        checkoutStarted: hasCheckoutStartedInSession(),
        cartHasItems: cartHasItemsRef.current,
      });
      if (resolved && !hasShownExitFeedback()) {
        mobilePendingRef.current = true;
      }
    };

    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [tryOpen]);

  const submit = async () => {
    const trimmed = answer.trim();
    if (!trimmed || !step || submitting) {
      close();
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = getExitFeedbackSessionId();
      if (!sessionId) {
        close();
        return;
      }
      await fetch("/api/exit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          step,
          page: pageAtOpen,
          answer: trimmed.slice(0, EXIT_FEEDBACK_ANSWER_MAX),
          is_internal: isInternalExitFeedbackSession(),
        }),
        keepalive: true,
      });
    } catch {
      // ignore network errors — never block dismiss
    } finally {
      setSubmitting(false);
      close();
    }
  };

  if (!open || !step) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="exit-feedback-title"
      className="fixed bottom-4 right-4 z-[60] w-[min(100%-2rem,22rem)] rounded-lg border border-border bg-background p-4 shadow-lg"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p
          id="exit-feedback-title"
          className="text-sm font-medium leading-snug text-foreground"
        >
          Vad hindrade dig från att reservera idag?
        </p>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Stäng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value.slice(0, EXIT_FEEDBACK_ANSWER_MAX))}
        placeholder="Valfritt — skriv gärna kort"
        rows={3}
        maxLength={EXIT_FEEDBACK_ANSWER_MAX}
        className="mb-3 resize-none"
        aria-label="Feedback"
      />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={close}
          disabled={submitting}
        >
          Stäng
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void submit()}
          disabled={submitting || !answer.trim()}
        >
          Skicka
        </Button>
      </div>
    </div>
  );
}
