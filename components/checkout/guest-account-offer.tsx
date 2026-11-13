"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";

/**
 * Optional post-purchase account claim for guest checkout.
 * Consent checkbox is never pre-checked.
 */
export function GuestAccountOffer(props: {
  email: string | null | undefined;
  reservationId: string | null | undefined;
  onClaimed?: () => void;
  onSkipped?: () => void;
}) {
  const shopping = useShoppingContextOptional();
  const t = shopping?.t ?? ((k: string) => k);
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const offeredRef = useRef(false);

  useEffect(() => {
    if (offeredRef.current) return;
    offeredRef.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "account_offered_on_confirmation",
      eventCategory: "account",
      metadata: {
        ...(props.reservationId
          ? { reservation_id: props.reservationId }
          : {}),
      },
    });
  }, [props.reservationId]);

  if (skipped) {
    return null;
  }

  if (done) {
    return (
      <div
        className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-4"
        data-testid="guest-account-offer-done"
      >
        <p className="text-sm text-gray-800">
          {t("checkout.guestAccountCreated")}
        </p>
      </div>
    );
  }

  const claim = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/claim-guest-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          marketingOptIn: consentChecked === true,
          reservationId: props.reservationId ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.error?.trim() || t("checkout.guestAccountFailed"));
        return;
      }
      setDone(true);
      props.onClaimed?.();
    } catch {
      setError(t("checkout.guestAccountFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white px-4 py-4"
      data-testid="guest-account-offer"
    >
      <div className="space-y-1">
        <h2 className="text-base font-medium text-gray-900">
          {t("checkout.guestAccountTitle")}
        </h2>
        <p className="text-sm text-gray-600">
          {t("checkout.guestAccountBody", {
            email: props.email?.trim() || "—",
          })}
        </p>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id="guest-account-consent"
          checked={consentChecked}
          onCheckedChange={(v) => setConsentChecked(v === true)}
          data-testid="guest-account-consent"
          className="mt-0.5"
        />
        <label
          htmlFor="guest-account-consent"
          className="text-sm leading-snug text-gray-800"
        >
          {t("checkout.guestAccountConsent")}
        </label>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => void claim()}
          disabled={submitting}
          data-testid="guest-account-create"
          className="bg-black text-white hover:bg-black/90"
        >
          {submitting
            ? t("checkout.processing")
            : t("checkout.guestAccountCreate")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSkipped(true);
            props.onSkipped?.();
          }}
          disabled={submitting}
          data-testid="guest-account-skip"
        >
          {t("checkout.guestAccountSkip")}
        </Button>
      </div>
    </div>
  );
}
