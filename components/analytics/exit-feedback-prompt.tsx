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
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import {
  EXIT_FEEDBACK_ANSWER_MAX,
  EXIT_FEEDBACK_MIN_ACTIVE_MS,
  EXIT_FEEDBACK_REASON_OPTIONS,
  getExitFeedbackSessionId,
  hasCheckoutStartedInSession,
  hasMetExitFeedbackActiveTime,
  isExitFeedbackBlockedPath,
  isInternalExitFeedbackSession,
  markExitFeedbackAnswered,
  markExitFeedbackDismissed,
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
  exitDiscountValidityDays,
  isExitDiscountEnabled,
} from "@/lib/exit-discount/config";
import {
  EXIT_FEEDBACK_THANKS_MESSAGE,
  EXIT_FEEDBACK_THANKS_MS,
} from "@/lib/exit-discount/messages";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  exitDiscountOfferTerms,
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

function stepLabel(phase: Phase): string | null {
  if (phase === "feedback" || phase === "thanks") return "1/2";
  if (phase === "discount") return "2/2";
  return null;
}

/**
 * Exit-intent feedback (+ optional discount). Never mounts usefully on B2B;
 * desktop-only exit-intent after 25s active time; localStorage persistence.
 */
export function ExitFeedbackPrompt() {
  const pathname = usePathname() ?? "/";
  const isB2B = useB2BModeServerHint();
  const cartCtx = useCartOptional();
  const cartHasItems = (cartCtx?.cart?.totalQuantity ?? 0) > 0;
  const discountEnabled = isExitDiscountEnabled();
  const offerTerms = exitDiscountOfferTerms(exitDiscountValidityDays());

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("feedback");
  const [step, setStep] = useState<ExitFeedbackStep | null>(null);
  const [reason, setReason] = useState<ExitFeedbackReason | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageAtOpen, setPageAtOpen] = useState("/");
  const [gatesReady, setGatesReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileAnswered, setProfileAnswered] = useState(false);

  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [discountError, setDiscountError] = useState("");
  const [claimedEmail, setClaimedEmail] = useState("");

  const openRef = useRef(false);
  const thanksTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const cartHasItemsRef = useRef(cartHasItems);
  const pathnameRef = useRef(pathname);
  const isAdminRef = useRef(false);
  const profileAnsweredRef = useRef(false);
  const isB2BRef = useRef(isB2B);
  cartHasItemsRef.current = cartHasItems;
  pathnameRef.current = pathname;
  isAdminRef.current = isAdmin;
  profileAnsweredRef.current = profileAnswered;
  isB2BRef.current = isB2B;
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

  const suppressNow = useCallback(() => {
    return shouldSuppressExitFeedbackUi({
      pathname: pathnameRef.current,
      isAdmin: isAdminRef.current,
      isB2B: isB2BRef.current,
      profileAnswered: profileAnsweredRef.current,
    });
  }, []);

  const tryOpen = useCallback(() => {
    if (openRef.current) return;
    if (!gatesReady) return;
    if (suppressNow()) return;
    if (!hasMetExitFeedbackActiveTime(activeMsRef.current)) return;
    // Desktop exit-intent only — no mobile visibility triggers.
    if (isCoarsePointer()) return;

    const pathNow =
      typeof window !== "undefined"
        ? window.location.pathname || pathnameRef.current
        : pathnameRef.current;
    if (isExitFeedbackBlockedPath(pathNow)) return;

    const resolved = resolveExitFeedbackStep({
      checkoutStarted: hasCheckoutStartedInSession(),
      cartHasItems: cartHasItemsRef.current,
    });
    if (!resolved) return;

    setStep(resolved);
    setReason(null);
    setAnswer("");
    setPhase("feedback");
    setPageAtOpen(pathNow);
    setOpen(true);
    openRef.current = true;
  }, [gatesReady, suppressNow]);

  // Admin + profile answered gates (hard suppress for owners).
  useEffect(() => {
    if (isB2B) {
      setGatesReady(true);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const [adminRes, statusRes] = await Promise.all([
          fetch("/api/me/admin"),
          fetch("/api/exit-feedback/status"),
        ]);
        if (cancelled) return;
        if (adminRes.ok) {
          const data = (await adminRes.json()) as { isAdmin?: boolean };
          if (data.isAdmin === true) {
            setIsAdmin(true);
            isAdminRef.current = true;
          }
        }
        if (statusRes.ok) {
          const data = (await statusRes.json()) as { answered?: boolean };
          if (data.answered === true) {
            setProfileAnswered(true);
            profileAnsweredRef.current = true;
            markExitFeedbackAnswered();
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setGatesReady(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isB2B]);

  // Active-time accumulator (only while tab visible).
  useEffect(() => {
    if (typeof window === "undefined" || isB2B) return;

    const tick = () => {
      const now = Date.now();
      if (
        document.visibilityState === "visible" &&
        lastTickRef.current != null
      ) {
        activeMsRef.current += now - lastTickRef.current;
      }
      lastTickRef.current =
        document.visibilityState === "visible" ? now : null;
    };

    lastTickRef.current =
      document.visibilityState === "visible" ? Date.now() : null;
    const id = window.setInterval(tick, 1000);
    const onVis = () => {
      // Pause counting when hidden; never open on return.
      if (document.visibilityState === "hidden") {
        tick();
        lastTickRef.current = null;
      } else {
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isB2B]);

  useEffect(() => {
    return () => clearThanksTimer();
  }, [clearThanksTimer]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (phase === "feedback") {
        void finishFeedbackRef.current(false);
      } else {
        closeAll();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, phase, closeAll]);

  // Desktop exit-intent only (mouse leaves viewport upward).
  useEffect(() => {
    if (typeof window === "undefined" || isB2B) return;

    const onMouseOut = (event: MouseEvent) => {
      if (isCoarsePointer()) return;
      if (event.relatedTarget != null) return;
      if (event.clientY > 0) return;
      tryOpen();
    };

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [tryOpen, isB2B]);

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
        markExitFeedbackAnswered();
        setProfileAnswered(true);
        profileAnsweredRef.current = true;
      } catch {
        // Still treat as answered locally so we do not nag.
        markExitFeedbackAnswered();
      } finally {
        setSubmitting(false);
      }

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

    // Soft dismiss without answer — 30 days.
    markExitFeedbackDismissed();
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

  if (isB2B || !open) return null;

  const title =
    phase === "feedback"
      ? "Vad hindrade dig från att reservera idag?"
      : phase === "thanks"
        ? EXIT_FEEDBACK_THANKS_MESSAGE
        : phase === "discount"
          ? EXIT_DISCOUNT_OFFER_HEADING
          : EXIT_DISCOUNT_ACCOUNT_HEADING;

  const steps = stepLabel(phase);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-background/40 sm:items-end sm:justify-end sm:bg-transparent sm:p-4"
      onPointerDown={onBackdropPointerDown}
      data-exit-prompt-backdrop=""
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-prompt-title"
        data-exit-prompt-panel=""
        className="inset-x-0 bottom-0 flex max-h-[min(85dvh,36rem)] w-full max-w-none flex-col overflow-hidden rounded-t-xl border border-border bg-background shadow-lg sm:mb-0 sm:max-w-[22rem] sm:rounded-lg"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 pb-3 pt-3">
          <div className="min-w-0 flex-1 pr-2">
            {steps ? (
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {steps}
              </p>
            ) : null}
            <p
              id="exit-prompt-title"
              className="text-sm font-medium leading-snug text-foreground"
            >
              {title}
            </p>
          </div>
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
                  className="min-h-11 px-4"
                  onClick={() => void finishFeedback(false)}
                  disabled={submitting}
                >
                  Stäng
                </Button>
                <Button
                  type="button"
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
                {offerTerms.map((term) => (
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
                className="min-h-11 w-full"
                onClick={() => void submitDiscount()}
                disabled={submitting || !email.trim() || !ageConfirmed}
              >
                {EXIT_DISCOUNT_OFFER_CTA}
              </Button>

              <p className="text-xs leading-snug text-muted-foreground">
                E-posten används för rabattkoden och ev. nyhetsbrev. Oanvänd kod
                raderas efter 12 månader. Ansvarig: EURPACT OÜ.{" "}
                <Link href="/privacy" className="underline underline-offset-2">
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
              <Button type="button" className="min-h-11 w-full" asChild>
                <Link href={exitDiscountSignupHref(claimedEmail)}>
                  {EXIT_DISCOUNT_ACCOUNT_CTA}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
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
