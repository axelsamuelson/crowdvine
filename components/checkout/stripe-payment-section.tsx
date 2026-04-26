"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";

type PaymentMode = "setup_intent" | "payment_intent";

type IntentCreated = {
  paymentMode: PaymentMode;
  intentId: string;
  bottlesFilled: number;
};

export type StripeConfirmResult = {
  success: boolean;
  intentId: string;
  error?: string;
};

type Props = {
  palletId: string;
  cartTotalSek: number;
  pactPointsRedeem: number;
  onIntentCreated: (data: IntentCreated) => void;
  onConfirmReady: (confirmFn: () => Promise<StripeConfirmResult>) => void;
};

const publishableKey =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "")
    : "";

/** Avoid calling `loadStripe("")` at module scope (causes Payment Element load failures). */
const stripePromise =
  publishableKey.length > 0 ? loadStripe(publishableKey) : null;

const pactAppearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#000000",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorTextSecondary: "#666666",
    colorTextPlaceholder: "#999999",
    colorDanger: "#dc2626",
    fontFamily: "Geist, system-ui, -apple-system, sans-serif",
    fontSizeBase: "14px",
    fontSizeSm: "12px",
    fontSizeXs: "11px",
    fontWeightNormal: "400",
    fontWeightMedium: "500",
    borderRadius: "6px",
    spacingUnit: "3px",
    spacingGridRow: "12px",
    spacingGridColumn: "12px",
  },
  rules: {
    ".Input": {
      border: "1px solid hsl(var(--border))",
      boxShadow: "none",
      padding: "10px 12px",
      fontSize: "14px",
    },
    ".Input:focus": {
      border: "1px solid hsl(var(--foreground))",
      boxShadow: "none",
    },
    ".Label": {
      fontWeight: "500",
      fontSize: "13px",
      marginBottom: "6px",
    },
    ".AccordionItem": {
      border: "1px solid hsl(var(--border))",
      boxShadow: "none",
      padding: "12px 16px",
    },
    ".AccordionItem--selected": {
      border: "1px solid hsl(var(--foreground))",
    },
    ".TermsText": {
      fontSize: "11px",
      color: "#666666",
      lineHeight: "1.5",
    },
    ".PickerItem": {
      padding: "12px 16px",
      border: "1px solid hsl(var(--border))",
      boxShadow: "none",
    },
    ".PickerItem--selected": {
      border: "1px solid hsl(var(--foreground))",
    },
  },
} as const;

function StripeElementInner({
  paymentMode,
  clientSecret,
  onConfirmReady,
  onPaymentElementLoadError,
}: {
  paymentMode: PaymentMode;
  clientSecret: string;
  onConfirmReady: (confirmFn: () => Promise<StripeConfirmResult>) => void;
  onPaymentElementLoadError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const onConfirmReadyRef = useRef(onConfirmReady);
  onConfirmReadyRef.current = onConfirmReady;

  const confirm = useCallback(async (): Promise<StripeConfirmResult> => {
    if (!stripe || !elements) {
      return { success: false, intentId: "", error: "Not ready" };
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      return {
        success: false,
        intentId: "",
        error: submitError.message ?? "Payment details invalid",
      };
    }

    const return_url = `${window.location.origin}/checkout/success`;

    if (paymentMode === "setup_intent") {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url },
      });
      if (error || !setupIntent?.id) {
        return { success: false, intentId: "", error: error?.message ?? "Failed to confirm setup" };
      }
      return { success: true, intentId: setupIntent.id };
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
      confirmParams: { return_url },
    });
    if (error || !paymentIntent?.id) {
      return { success: false, intentId: "", error: error?.message ?? "Failed to confirm payment" };
    }
    return { success: true, intentId: paymentIntent.id };
  }, [clientSecret, elements, paymentMode, stripe]);

  useEffect(() => {
    onConfirmReadyRef.current(confirm);
  }, [confirm]);

  return (
    <PaymentElement
      options={{
        layout: {
          type: "accordion",
          defaultCollapsed: false,
          radios: true,
          spacedAccordionItems: false,
        },
      }}
      onLoadError={(event) => {
        const err = event.error;
        const message =
          typeof err?.message === "string" && err.message.length > 0
            ? err.message
            : typeof err?.type === "string"
              ? `Payment form failed to load (${err.type})`
              : "Payment form failed to load";
        onPaymentElementLoadError(message);
      }}
    />
  );
}

export function StripePaymentSection({
  palletId,
  cartTotalSek,
  pactPointsRedeem,
  onIntentCreated,
  onConfirmReady,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentElementLoadError, setPaymentElementLoadError] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const onIntentCreatedRef = useRef(onIntentCreated);
  onIntentCreatedRef.current = onIntentCreated;

  const requestBody = useMemo(
    () => ({
      pallet_id: palletId,
      cart_total_sek: cartTotalSek,
      pact_points_redeem: pactPointsRedeem,
    }),
    [palletId, cartTotalSek, pactPointsRedeem],
  );

  const fetchIntent = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPaymentElementLoadError(null);
    try {
      const res = await fetch("/api/checkout/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== "object") {
        const msg =
          data && typeof data === "object" && "error" in data
            ? String((data as { error?: unknown }).error ?? "Failed to create intent")
            : "Failed to create payment intent";
        throw new Error(msg);
      }

      const d = data as {
        paymentMode?: unknown;
        clientSecret?: unknown;
        intentId?: unknown;
        bottlesFilled?: unknown;
      };

      const mode =
        d.paymentMode === "setup_intent" || d.paymentMode === "payment_intent"
          ? d.paymentMode
          : null;
      const cs = typeof d.clientSecret === "string" ? d.clientSecret : null;
      const id = typeof d.intentId === "string" ? d.intentId : null;
      const filled = typeof d.bottlesFilled === "number" ? d.bottlesFilled : 0;

      if (!mode || !cs || !id) {
        throw new Error("Invalid payment intent response");
      }

      setPaymentMode(mode);
      setClientSecret(cs);
      setIntentId(id);
      onIntentCreatedRef.current({
        paymentMode: mode,
        intentId: id,
        bottlesFilled: filled,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create payment intent";
      setError(msg);
      setClientSecret(null);
      setPaymentMode(null);
      setIntentId(null);
    } finally {
      setLoading(false);
    }
  }, [requestBody]);

  useEffect(() => {
    void fetchIntent();
  }, [fetchIntent]);

  if (!publishableKey) {
    return (
      <div className="rounded-md border border-border bg-background p-4 text-sm text-destructive">
        Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
      </div>
    );
  }

  if (loading && !clientSecret) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-background p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-full animate-pulse rounded bg-muted" />
        <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-md border border-border bg-background p-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={fetchIntent}>
          Retry
        </Button>
      </div>
    );
  }

  if (!clientSecret || !paymentMode || !intentId) {
    return null;
  }

  return (
    <div className="space-y-3">
      {paymentElementLoadError ? (
        <div className="space-y-2 rounded-md border border-border bg-background p-4">
          <p className="text-sm text-destructive">{paymentElementLoadError}</p>
          <p className="text-xs text-muted-foreground">
            Often caused by a mismatch between test/live keys, an expired client
            secret, or a blocked network. Try again after verifying your Stripe
            publishable key matches the account that created the intent.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={fetchIntent}>
            Retry
          </Button>
        </div>
      ) : (
        <Elements
          key={clientSecret}
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: pactAppearance,
            locale: "en",
            fonts: [
              {
                cssSrc:
                  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap",
              },
            ],
          }}
        >
          <StripeElementInner
            paymentMode={paymentMode}
            clientSecret={clientSecret}
            onConfirmReady={onConfirmReady}
            onPaymentElementLoadError={setPaymentElementLoadError}
          />
        </Elements>
      )}
    </div>
  );
}

