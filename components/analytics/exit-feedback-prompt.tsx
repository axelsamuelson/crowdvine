"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useCartOptional } from "@/components/cart/cart-context";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EXIT_FEEDBACK_ANSWER_MAX,
  EXIT_FEEDBACK_REASON_OPTIONS,
  getExitFeedbackSessionId,
  hasCheckoutStartedInSession,
  hasShownExitFeedback,
  isInternalExitFeedbackSession,
  markExitFeedbackShown,
  resolveExitFeedbackStep,
  shouldSuppressExitFeedbackUi,
  type ExitFeedbackReason,
  type ExitFeedbackStep,
} from "@/lib/analytics/exit-feedback";
import {
  EXIT_DISCOUNT_ACCOUNT_BULLETS,
  EXIT_DISCOUNT_ACCOUNT_CTA,
  EXIT_DISCOUNT_ACCOUNT_DECLINE,
  EXIT_DISCOUNT_ACCOUNT_HEADING,
  exitDiscountSignupHref,
} from "@/lib/exit-discount/account-copy";
import {
  EXIT_DISCOUNT_SHOWN_KEY,
  isExitDiscountEnabled,
} from "@/lib/exit-discount/config";
import {
  EXIT_FEEDBACK_THANKS_MESSAGE,
  EXIT_FEEDBACK_THANKS_MS,
} from "@/lib/exit-discount/messages";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  EXIT_DISCOUNT_OFFER_TERMS,
} from "@/lib/exit-discount/offer-copy";

type Phase = "feedback" | "thanks" | "discount" | "account";

function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function hasShownExitDiscount(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(EXIT_DISCOUNT_SHOWN_KEY) === "1";
  } catch {
    return true;
  }
}

function markExitDiscountShown(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(EXIT_DISCOUNT_SHOWN_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * Standalone exit-intent / abandoned-cart feedback (+ optional discount step).
 * Mounted from root layout — does not touch checkout-client or other CRO files.
 * Design: existing Tailwind tokens only; easy dismiss (X / Esc / backdrop);
 * mobile-friendly max-height + scroll for keyboard.
 */
export function ExitFeedbackPrompt() {
  const pathname = usePathname() ?? "/";
  const cartCtx = useCartOptional();
  const cartHasItems = (cartCtx?.cart?.totalQuantity ?? 0) > 0;
  const discountEnabled = isExitDiscountEnabled();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("feedback");
  const [step, setStep] = useState<ExitFeedbackStep | null>(null);
  const [reason, setReason] = useState<ExitFeedbackReason | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageAtOpen, setPageAtOpen] = useState("/");

  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [claimedEmail, setClaimedEmail] = useState("");

  const openRef = useRef(false);
  const mobilePendingRef = useRef(false);
  const thanksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cartHasItemsRef = useRef(cartHasItems);
  cartHasItemsRef.current = cartHasItems;
  openRef.current = open;

  const clearThanksTimer = useCallback(() => {
    if (thanksTimerRef.current != null) {
      clearTimeout(thanksTimerRef.current);
      thanksTimerRef.current = null;
    }
  }, []);

  const closeAll = useCallback(() => {
    clearThanksTimer();
    setOpen(false);
    openRef.current = false;
    setPhase("feedback");
    setDiscountError("");
  }, [clearThanksTimer]);

  const maybeOpenDiscount = useCallback(() => {
    if (!discountEnabled || hasShownExitDiscount()) {
      closeAll();
      return;
    }
    markExitDiscountShown();
    setPhase("discount");
    setEmail("");
    setAgeConfirmed(false);
    setNewsletterOptIn(false);
    setDiscountError("");
    setOpen(true);
    openRef.current = true;
  }, [closeAll, discountEnabled]);

  const tryOpen = useCallback(() => {
    if (openRef.current || hasShownExitFeedback()) return;
    if (shouldSuppressExitFeedbackUi()) return;

    const resolved = resolveExitFeedbackStep({
      checkoutStarted: hasCheckoutStartedInSession(),
      cartHasItems: cartHasItemsRef.current,
    });
    if (!resolved) return;

    markExitFeedbackShown();
    setStep(resolved);
    setReason(null);
    setAnswer("");
    setPhase("feedback");
    setPageAtOpen(
      typeof window !== "undefined"
        ? window.location.pathname || pathname
        : pathname,
    );
    setOpen(true);
    openRef.current = true;
  }, [pathname]);

  useEffect(() => {
    return () => clearThanksTimer();
  }, [clearThanksTimer]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (phase === "feedback") {
          void finishFeedbackRef.current(false);
        } else {
          closeAll();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, phase, closeAll]);

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

  const finishFeedback = async (shouldSubmit: boolean) => {
    if (shouldSubmit && reason && step) {
      setSubmitting(true);
      try {
        const sessionId = getExitFeedbackSessionId();
        if (sessionId) {
          const trimmed = answer.trim().slice(0, EXIT_FEEDBACK_ANSWER_MAX);
          await fetch("/api/exit-feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              step,
              page: pageAtOpen,
              reason,
              answer: trimmed || null,
              is_internal: isInternalExitFeedbackSession(),
            }),
            keepalive: true,
          });
        }
      } catch {
        // ignore
      } finally {
        setSubmitting(false);
      }

      // Short thank-you even when the discount step flag is off.
      clearThanksTimer();
      setPhase("thanks");
      setOpen(true);
      openRef.current = true;
      thanksTimerRef.current = setTimeout(() => {
        thanksTimerRef.current = null;
        maybeOpenDiscount();
      }, EXIT_FEEDBACK_THANKS_MS);
      return;
    }
    maybeOpenDiscount();
  };

  const finishFeedbackRef = useRef(finishFeedback);
  finishFeedbackRef.current = finishFeedback;

  const submitDiscount = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !ageConfirmed) {
      setDiscountError("Fyll i e-post och bekräfta ålder.");
      return;
    }
    setSubmitting(true);
    setDiscountError("");
    try {
      const res = await fetch("/api/exit-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          age_confirmed: true,
          newsletter_opt_in: newsletterOptIn,
        }),
      });
      if (!res.ok) {
        setDiscountError("Kunde inte skicka rabattkoden. Försök igen.");
        return;
      }
      setClaimedEmail(trimmedEmail);
      setPhase("account");
    } catch {
      setDiscountError("Kunde inte skicka rabattkoden. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  const onBackdropPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (phase === "feedback") {
      void finishFeedback(false);
    } else {
      closeAll();
    }
  };

  if (!open) return null;

  const title =
    phase === "feedback"
      ? "Vad hindrade dig från att reservera idag?"
      : phase === "thanks"
        ? EXIT_FEEDBACK_THANKS_MESSAGE
        : phase === "discount"
          ? EXIT_DISCOUNT_OFFER_HEADING
          : EXIT_DISCOUNT_ACCOUNT_HEADING;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-background/40 p-3 sm:items-end sm:justify-end sm:bg-transparent sm:p-4"
      onPointerDown={onBackdropPointerDown}
      data-exit-prompt-backdrop=""
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-prompt-title"
        data-exit-prompt-panel=""
        className="flex max-h-[min(85dvh,36rem)] w-full max-w-[22rem] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-lg sm:mb-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 pb-3 pt-3">
          <p
            id="exit-prompt-title"
            className="pr-2 text-sm font-medium leading-snug text-foreground"
          >
            {title}
          </p>
          <button
            type="button"
            onClick={
              phase === "feedback"
                ? () => void finishFeedback(false)
                : closeAll
            }
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {phase === "feedback" && step ? (
            <>
              <fieldset className="mb-3 space-y-1">
                <legend className="sr-only">Välj anledning</legend>
                {EXIT_FEEDBACK_REASON_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 py-2 text-sm text-foreground"
                  >
                    <input
                      type="radio"
                      name="exit-feedback-reason"
                      value={opt.value}
                      checked={reason === opt.value}
                      onChange={() => setReason(opt.value)}
                      className="size-5 shrink-0 accent-primary"
                    />
                    <span className="leading-snug">{opt.label}</span>
                  </label>
                ))}
              </fieldset>

              {reason === "other" ? (
                <Textarea
                  value={answer}
                  onChange={(e) =>
                    setAnswer(e.target.value.slice(0, EXIT_FEEDBACK_ANSWER_MAX))
                  }
                  placeholder="Valfritt — skriv gärna kort"
                  rows={2}
                  maxLength={EXIT_FEEDBACK_ANSWER_MAX}
                  className="mb-3 min-h-[4.5rem] resize-none"
                  aria-label="Annat — fritext"
                />
              ) : null}

              <div className="flex items-center justify-end gap-2 pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="min-h-11 px-4"
                  onClick={() => void finishFeedback(false)}
                  disabled={submitting}
                >
                  Stäng
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-11 px-4"
                  onClick={() => void finishFeedback(true)}
                  disabled={submitting || !reason}
                >
                  Skicka
                </Button>
              </div>
            </>
          ) : null}

          {phase === "thanks" ? (
            <p className="pb-2 text-sm leading-snug text-muted-foreground">
              {EXIT_FEEDBACK_THANKS_MESSAGE}
            </p>
          ) : null}

          {phase === "discount" ? (
            <div className="space-y-3 pb-1">
              <ul className="list-disc space-y-1 pl-4 text-xs leading-snug text-muted-foreground">
                {EXIT_DISCOUNT_OFFER_TERMS.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>

              <div>
                <label
                  htmlFor="exit-discount-email"
                  className="mb-1 block text-xs font-medium text-foreground"
                >
                  E-post
                </label>
                <Input
                  id="exit-discount-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  enterKeyHint="done"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="min-h-11"
                />
              </div>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
                <Checkbox
                  checked={ageConfirmed}
                  onCheckedChange={(v) => setAgeConfirmed(v === true)}
                  className="mt-1 size-5"
                />
                <span className="leading-snug">Jag är minst 20 år.</span>
              </label>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
                <Checkbox
                  checked={newsletterOptIn}
                  onCheckedChange={(v) => setNewsletterOptIn(v === true)}
                  className="mt-1 size-5"
                />
                <span className="leading-snug">
                  Ja tack, skicka nyhetsbrev om nya viner. Du kan avregistrera
                  dig när som helst.
                </span>
              </label>

              {discountError ? (
                <p className="text-xs text-destructive">{discountError}</p>
              ) : null}

              <Button
                type="button"
                size="sm"
                className="min-h-11 w-full"
                onClick={() => void submitDiscount()}
                disabled={submitting || !email.trim() || !ageConfirmed}
              >
                {EXIT_DISCOUNT_OFFER_CTA}
              </Button>

              <p className="text-xs leading-snug text-muted-foreground">
                Vi använder din e-post för rabattkoden och, om du kryssat i,
                nyhetsbrevet. Oanvänd kod raderas efter 12 månader.
                Personuppgiftsansvarig: EURPACT OÜ.{" "}
                <Link
                  href="/privacy"
                  className="underline underline-offset-2"
                >
                  Integritetspolicy
                </Link>
                .{" "}
                <a
                  href="mailto:customer@pactwines.com"
                  className="underline underline-offset-2"
                >
                  customer@pactwines.com
                </a>
              </p>
            </div>
          ) : null}

          {phase === "account" ? (
            <div className="space-y-3 pb-1">
              <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-foreground">
                {EXIT_DISCOUNT_ACCOUNT_BULLETS.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                className="min-h-11 w-full"
                asChild
              >
                <Link href={exitDiscountSignupHref(claimedEmail)}>
                  {EXIT_DISCOUNT_ACCOUNT_CTA}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11 w-full"
                onClick={closeAll}
              >
                {EXIT_DISCOUNT_ACCOUNT_DECLINE}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
