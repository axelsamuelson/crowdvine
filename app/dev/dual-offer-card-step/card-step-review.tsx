"use client";

import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";

/**
 * Review fixture: mount Payment Element with a TEST SetupIntent client secret
 * from /api/dev/stripe-setup-intent. Confirm with empty fields → incomplete error.
 */
function CardStepInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onShowError = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url:
            typeof window !== "undefined"
              ? `${window.location.origin}/dev/dual-offer-card-step`
              : undefined,
        },
      });
      if (result.error) {
        setError(
          result.error.message ||
            "Your card number is incomplete.",
        );
      } else {
        setError("Unexpected success — use an incomplete card for the error state.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-background p-4">
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
        }}
      />
      {error ? (
        <p
          className="text-sm text-destructive"
          data-testid="dual-offer-card-step-error"
          role="alert"
        >
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Click below with empty/incomplete fields to capture the error state.
        </p>
      )}
      <Button
        type="button"
        className="w-full"
        disabled={!stripe || !elements || busy}
        onClick={() => void onShowError()}
        data-testid="dual-offer-card-step-confirm"
      >
        {busy ? "…" : "Show incomplete-card error"}
      </Button>
    </div>
  );
}

function StaticCardMock() {
  return (
    <div
      className="space-y-3 rounded-xl border border-border bg-background p-4"
      data-testid="dual-offer-card-step-mock"
    >
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Card number</label>
        <div className="h-10 rounded-md border border-border bg-muted/30 px-3 text-sm leading-10 text-muted-foreground">
          4242 4242 4242
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Expiry</label>
          <div className="h-10 rounded-md border border-border bg-muted/30 px-3 text-sm leading-10 text-muted-foreground">
            MM / YY
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">CVC</label>
          <div className="h-10 rounded-md border border-border bg-muted/30 px-3 text-sm leading-10 text-muted-foreground">
            CVC
          </div>
        </div>
      </div>
      <p
        className="text-sm text-destructive"
        data-testid="dual-offer-card-step-error"
        role="alert"
      >
        Your card number is incomplete.
      </p>
      <p className="text-xs text-muted-foreground">
        Static mock (Stripe publishable key or SetupIntent unavailable).
      </p>
    </div>
  );
}

export function DualOfferCardStepReview() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dev/stripe-setup-intent", {
          method: "POST",
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !data?.clientSecret) {
          setLoadError(data?.error || "setup_intent_unavailable");
          return;
        }
        setClientSecret(String(data.clientSecret));
      } catch {
        if (!cancelled) setLoadError("setup_intent_fetch_failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stripePromise = useMemo(
    () => (pk ? loadStripe(pk) : null),
    [pk],
  );

  if (!pk || loadError || !clientSecret || !stripePromise) {
    return <StaticCardMock />;
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <CardStepInner />
    </Elements>
  );
}
