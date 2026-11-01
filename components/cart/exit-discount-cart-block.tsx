"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { claimOnce } from "@/lib/analytics/emit-once";
import {
  EXIT_DISCOUNT_ACCOUNT_BULLETS,
  EXIT_DISCOUNT_ACCOUNT_CTA,
  EXIT_DISCOUNT_ACCOUNT_DECLINE,
  EXIT_DISCOUNT_ACCOUNT_HEADING,
  exitDiscountSignupHref,
} from "@/lib/exit-discount/account-copy";
import {
  exitDiscountValidityDays,
  isExitDiscountEnabled,
} from "@/lib/exit-discount/config";
import {
  EXIT_DISCOUNT_OFFER_CTA,
  EXIT_DISCOUNT_OFFER_HEADING,
  exitDiscountOfferTerms,
} from "@/lib/exit-discount/offer-copy";

type Phase = "offer" | "account" | "done";

const SHOWN_CLAIM_PREFIX = "exit_discount_cart_shown:";

/**
 * Inline 10% exit-discount offer inside the cart drawer (not a modal).
 * Behind EXIT_DISCOUNT_ENABLED / NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED (default OFF).
 */
export function ExitDiscountCartBlock() {
  const enabled = isExitDiscountEnabled();
  const offerTerms = exitDiscountOfferTerms(exitDiscountValidityDays());

  const [phase, setPhase] = useState<Phase>("offer");
  const [email, setEmail] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [claimedEmail, setClaimedEmail] = useState("");
  const shownLoggedRef = useRef(false);

  useEffect(() => {
    if (!enabled || phase !== "offer" || shownLoggedRef.current) return;
    // Once per analytics session view of this block.
    const sessionKey =
      typeof window !== "undefined"
        ? sessionStorage.getItem("analytics_session_id") || "anon"
        : "anon";
    if (!claimOnce(`${SHOWN_CLAIM_PREFIX}${sessionKey}`)) {
      shownLoggedRef.current = true;
      return;
    }
    shownLoggedRef.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "exit_discount_shown",
      eventCategory: "cart",
      metadata: { placement: "cart_drawer" },
    });
  }, [enabled, phase]);

  if (!enabled) return null;

  const submit = async () => {
    if (submitting) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !ageConfirmed) {
      setError("Fyll i e-post och bekräfta ålder.");
      return;
    }
    setSubmitting(true);
    setError("");
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
        setError("Kunde inte skicka rabattkoden. Försök igen.");
        return;
      }
      void AnalyticsTracker.trackEvent({
        eventType: "exit_discount_submitted",
        eventCategory: "cart",
        metadata: {
          placement: "cart_drawer",
          newsletter_opt_in: newsletterOptIn,
        },
      });
      setClaimedEmail(trimmedEmail);
      setPhase("account");
    } catch {
      setError("Kunde inte skicka rabattkoden. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === "done") return null;

  return (
    <section
      data-exit-discount-cart-block=""
      aria-labelledby="exit-discount-cart-heading"
      className="mb-3 border-t border-border pt-3"
    >
      {phase === "offer" ? (
        <div className="space-y-3">
          <h2
            id="exit-discount-cart-heading"
            className="text-sm font-medium leading-snug text-foreground"
          >
            {EXIT_DISCOUNT_OFFER_HEADING}
          </h2>

          <ul className="list-disc space-y-1 pl-4 text-xs leading-snug text-muted-foreground">
            {offerTerms.map((term) => (
              <li key={term}>{term}</li>
            ))}
          </ul>

          <div>
            <label
              htmlFor="exit-discount-cart-email"
              className="mb-1 block text-xs font-medium text-foreground"
            >
              E-post
            </label>
            <Input
              id="exit-discount-cart-email"
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
              data-exit-discount-age=""
            />
            <span className="leading-snug">Jag är minst 20 år.</span>
          </label>

          <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-foreground">
            <Checkbox
              checked={newsletterOptIn}
              onCheckedChange={(v) => setNewsletterOptIn(v === true)}
              className="mt-1 size-5"
              data-exit-discount-newsletter=""
            />
            <span className="leading-snug">
              Ja tack, skicka nyhetsbrev om nya viner. Du kan avregistrera dig
              när som helst.
            </span>
          </label>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            className="min-h-11 w-full"
            onClick={() => void submit()}
            disabled={submitting || !email.trim() || !ageConfirmed}
            data-exit-discount-submit=""
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
        <div
          className="space-y-3"
          data-exit-discount-account-step=""
          aria-labelledby="exit-discount-account-heading"
        >
          <p className="text-sm leading-snug text-muted-foreground">
            Rabattkoden är skickad till {claimedEmail}.
          </p>
          <h2
            id="exit-discount-account-heading"
            className="text-sm font-medium leading-snug text-foreground"
          >
            {EXIT_DISCOUNT_ACCOUNT_HEADING}
          </h2>
          <p className="text-xs leading-snug text-muted-foreground">
            Valfritt — du kan hoppa över det här steget.
          </p>
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
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => setPhase("done")}
            data-exit-discount-account-skip=""
          >
            {EXIT_DISCOUNT_ACCOUNT_DECLINE}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
