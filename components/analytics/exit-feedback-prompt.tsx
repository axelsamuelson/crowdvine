"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type Phase = "feedback" | "discount" | "account";

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
  const cartHasItemsRef = useRef(cartHasItems);
  cartHasItemsRef.current = cartHasItems;
  openRef.current = open;

  const closeAll = useCallback(() => {
    setOpen(false);
    openRef.current = false;
    setPhase("feedback");
    setDiscountError("");
  }, []);

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
    }
    maybeOpenDiscount();
  };

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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="exit-prompt-title"
      className="fixed bottom-4 right-4 z-[60] w-[min(100%-2rem,22rem)] rounded-lg border border-border bg-background p-4 shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p
          id="exit-prompt-title"
          className="text-sm font-medium leading-snug text-foreground"
        >
          {phase === "feedback"
            ? "Vad hindrade dig från att reservera idag?"
            : phase === "discount"
              ? "Vill du ha 10 % på din första beställning?"
              : EXIT_DISCOUNT_ACCOUNT_HEADING}
        </p>
        <button
          type="button"
          onClick={
            phase === "feedback"
              ? () => void finishFeedback(false)
              : closeAll
          }
          className="shrink-0 rounded-sm p-1 text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Stäng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {phase === "feedback" && step ? (
        <>
          <fieldset className="mb-3 space-y-2">
            <legend className="sr-only">Välj anledning</legend>
            {EXIT_FEEDBACK_REASON_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-start gap-2 text-sm text-foreground"
              >
                <input
                  type="radio"
                  name="exit-feedback-reason"
                  value={opt.value}
                  checked={reason === opt.value}
                  onChange={() => setReason(opt.value)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
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
              className="mb-3 resize-none"
              aria-label="Annat — fritext"
            />
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void finishFeedback(false)}
              disabled={submitting}
            >
              Stäng
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void finishFeedback(true)}
              disabled={submitting || !reason}
            >
              Skicka
            </Button>
          </div>
        </>
      ) : null}

      {phase === "discount" ? (
        <div className="space-y-3">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="namn@exempel.se"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <Checkbox
              checked={ageConfirmed}
              onCheckedChange={(v) => setAgeConfirmed(v === true)}
              className="mt-0.5"
            />
            <span className="leading-snug">Jag är minst 20 år.</span>
          </label>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
            <Checkbox
              checked={newsletterOptIn}
              onCheckedChange={(v) => setNewsletterOptIn(v === true)}
              className="mt-0.5"
            />
            <span className="leading-snug">
              Ja, skicka PACT:s nyhetsbrev med nya viner och pallar. Jag kan
              avregistrera mig när som helst.
            </span>
          </label>

          {discountError ? (
            <p className="text-xs text-destructive">{discountError}</p>
          ) : null}

          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => void submitDiscount()}
            disabled={submitting || !email.trim() || !ageConfirmed}
          >
            Skicka min rabattkod
          </Button>

          <p className="text-[11px] leading-snug text-muted-foreground">
            Vi använder din e-post för att skicka rabattkoden och, om du kryssat
            i rutan, vårt nyhetsbrev. Har du inte använt koden sparas e-posten i
            12 månader och raderas sedan; nyhetsbrevet får du tills du
            avregistrerar dig. Personuppgiftsansvarig är EURPACT OÜ. Läs mer i
            vår{" "}
            <Link href="/privacy" className="underline underline-offset-2">
              integritetspolicy
            </Link>
            . Frågor:{" "}
            <a
              href="mailto:customer@pactwines.com"
              className="underline underline-offset-2"
            >
              customer@pactwines.com
            </a>
            .
          </p>
        </div>
      ) : null}

      {phase === "account" ? (
        <div className="space-y-3">
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-foreground">
            {EXIT_DISCOUNT_ACCOUNT_BULLETS.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <Button type="button" size="sm" className="w-full" asChild>
            <Link href={exitDiscountSignupHref(claimedEmail)}>
              {EXIT_DISCOUNT_ACCOUNT_CTA}
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={closeAll}
          >
            {EXIT_DISCOUNT_ACCOUNT_DECLINE}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
