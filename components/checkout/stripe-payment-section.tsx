"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export type StripeConfirmStripeError = {
  type?: string;
  code?: string;
  decline_code?: string;
  message?: string;
};

/**
 * Discriminated union: `success` is always present; when `success === true`,
 * `intentId` and `intentType` are required (TypeScript narrows after guards).
 */
export type StripeConfirmResult =
  | {
      success: true;
      intentId: string;
      intentType: PaymentMode;
    }
  | {
      success: false;
      intentId?: string;
      intentType?: PaymentMode;
      error?: string;
      /** Safe-to-log Stripe error fields (never include client_secret). */
      stripeError?: StripeConfirmStripeError;
      /** For debugging state-machine issues. */
      intentStatus?: string;
    };

function formatStripeErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const e = error as { message?: unknown; code?: unknown; type?: unknown; decline_code?: unknown };
  const message = typeof e.message === "string" && e.message.trim() ? e.message.trim() : fallback;
  const code = typeof e.code === "string" && e.code.trim() ? e.code.trim() : null;
  const type = typeof e.type === "string" && e.type.trim() ? e.type.trim() : null;
  const decline = typeof e.decline_code === "string" && e.decline_code.trim() ? e.decline_code.trim() : null;
  const meta = [type ? `type=${type}` : null, code ? `code=${code}` : null, decline ? `decline=${decline}` : null]
    .filter(Boolean)
    .join(" ");
  return meta ? `${message} (${meta})` : message;
}

type Props = {
  palletId: string;
  cartTotalSek: number;
  pactPointsRedeem: number;
  onIntentCreated: (data: IntentCreated) => void;
  onConfirmReady: (confirmFn: () => Promise<StripeConfirmResult>) => void;
  /** US conditional: include acks in /api/checkout/payment-intent body */
  usConditionalPayment?: boolean;
  usAge21Confirmed?: boolean;
  usConditionalAck?: boolean;
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
      return { success: false, error: "Not ready" };
    }

    const { error: submitError } = await elements.submit();
    if (submitError) {
      return {
        success: false,
        error: submitError.message ?? "Payment details invalid",
        stripeError: {
          type:
            typeof (submitError as { type?: unknown })?.type === "string"
              ? String((submitError as { type?: unknown }).type)
              : undefined,
          code:
            typeof (submitError as { code?: unknown })?.code === "string"
              ? String((submitError as { code?: unknown }).code)
              : undefined,
          decline_code:
            typeof (submitError as { decline_code?: unknown })?.decline_code === "string"
              ? String((submitError as { decline_code?: unknown }).decline_code)
              : undefined,
          message:
            typeof (submitError as { message?: unknown })?.message === "string"
              ? String((submitError as { message?: unknown }).message)
              : undefined,
        },
      };
    }

    const return_url = `${window.location.origin}/checkout/stripe-return`;

    if (paymentMode === "setup_intent") {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: "if_required",
        confirmParams: { return_url },
      });
      const setupStatus = setupIntent?.status;
      if (error || !setupIntent?.id || setupStatus !== "succeeded") {
        if (error) {
          console.error("[Stripe] confirmSetup error:", {
            type: (error as { type?: unknown })?.type,
            code: (error as { code?: unknown })?.code,
            decline_code: (error as { decline_code?: unknown })?.decline_code,
            message: (error as { message?: unknown })?.message,
          });
        }
        return {
          success: false,
          intentStatus: typeof setupStatus === "string" ? setupStatus : undefined,
          stripeError: error
            ? {
                type:
                  typeof (error as { type?: unknown })?.type === "string"
                    ? String((error as { type?: unknown }).type)
                    : undefined,
                code:
                  typeof (error as { code?: unknown })?.code === "string"
                    ? String((error as { code?: unknown }).code)
                    : undefined,
                decline_code:
                  typeof (error as { decline_code?: unknown })?.decline_code === "string"
                    ? String((error as { decline_code?: unknown }).decline_code)
                    : undefined,
                message:
                  typeof (error as { message?: unknown })?.message === "string"
                    ? String((error as { message?: unknown }).message)
                    : undefined,
              }
            : setupStatus && setupStatus !== "succeeded"
              ? {
                  code: "setup_intent_not_succeeded",
                  message: `SetupIntent status is ${setupStatus}`,
                }
              : undefined,
          error: error
            ? formatStripeErrorMessage(error, "Failed to confirm setup")
            : setupStatus && setupStatus !== "succeeded"
              ? `Card confirmation not completed (status: ${setupStatus})`
              : "Failed to confirm setup",
        };
      }
      return {
        success: true,
        intentId: setupIntent.id,
        intentType: "setup_intent",
      };
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: "if_required",
      confirmParams: { return_url },
    });
    const piStatus = paymentIntent?.status;
    if (error || !paymentIntent?.id || piStatus !== "succeeded") {
      if (error) {
        console.error("[Stripe] confirmPayment error:", {
          type: (error as { type?: unknown })?.type,
          code: (error as { code?: unknown })?.code,
          decline_code: (error as { decline_code?: unknown })?.decline_code,
          message: (error as { message?: unknown })?.message,
        });
      }
      return {
        success: false,
        intentStatus: typeof piStatus === "string" ? piStatus : undefined,
        stripeError: error
          ? {
              type:
                typeof (error as { type?: unknown })?.type === "string"
                  ? String((error as { type?: unknown }).type)
                  : undefined,
              code:
                typeof (error as { code?: unknown })?.code === "string"
                  ? String((error as { code?: unknown }).code)
                  : undefined,
              decline_code:
                typeof (error as { decline_code?: unknown })?.decline_code === "string"
                  ? String((error as { decline_code?: unknown }).decline_code)
                  : undefined,
              message:
                typeof (error as { message?: unknown })?.message === "string"
                  ? String((error as { message?: unknown }).message)
                  : undefined,
            }
          : piStatus && piStatus !== "succeeded"
            ? {
                code: "payment_intent_not_succeeded",
                message: `PaymentIntent status is ${piStatus}`,
              }
            : undefined,
        error: error
          ? formatStripeErrorMessage(error, "Failed to confirm payment")
          : piStatus && piStatus !== "succeeded"
            ? `Payment not completed (status: ${piStatus})`
            : "Failed to confirm payment",
      };
    }
    return {
      success: true,
      intentId: paymentIntent.id,
      intentType: "payment_intent",
    };
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
  usConditionalPayment = false,
  usAge21Confirmed = false,
  usConditionalAck = false,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentElementLoadError, setPaymentElementLoadError] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const onIntentCreatedRef = useRef(onIntentCreated);
  onIntentCreatedRef.current = onIntentCreated;

  /** When cart / pallet / points change, allow a fresh payment-intent fetch. */
  const fetchedRef = useRef(false);
  useEffect(() => {
    fetchedRef.current = false;
  }, [
    palletId,
    cartTotalSek,
    pactPointsRedeem,
    usConditionalPayment,
    usAge21Confirmed,
    usConditionalAck,
  ]);

  useEffect(() => {
    if (
      usConditionalPayment &&
      (!usAge21Confirmed || !usConditionalAck)
    ) {
      fetchedRef.current = false;
      setClientSecret(null);
      setPaymentMode(null);
      setIntentId(null);
      setError(null);
      setPaymentElementLoadError(null);
      setLoading(false);
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const controller = new AbortController();

    async function fetchIntent() {
      setLoading(true);
      setError(null);
      setPaymentElementLoadError(null);
      try {
        const res = await fetch("/api/checkout/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pallet_id: palletId,
            cart_total_sek: cartTotalSek,
            pact_points_redeem: pactPointsRedeem,
            ...(usConditionalPayment
              ? {
                  us_age_21_confirmed: true,
                  us_conditional_ack: true,
                }
              : {}),
          }),
          signal: controller.signal,
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
        if (e instanceof DOMException && e.name === "AbortError") {
          fetchedRef.current = false;
          return;
        }
        if (e instanceof Error && e.name === "AbortError") {
          fetchedRef.current = false;
          return;
        }
        const msg =
          e instanceof Error ? e.message : "Failed to create payment intent";
        fetchedRef.current = false;
        setError(msg);
        setClientSecret(null);
        setPaymentMode(null);
        setIntentId(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchIntent();

    return () => {
      controller.abort();
      fetchedRef.current = false;
    };
  }, [
    palletId,
    cartTotalSek,
    pactPointsRedeem,
    retryNonce,
    usConditionalPayment,
    usAge21Confirmed,
    usConditionalAck,
  ]);

  const requestRetry = useCallback(() => {
    fetchedRef.current = false;
    setRetryNonce((n) => n + 1);
  }, []);

  if (!publishableKey) {
    return (
      <div className="rounded-md border border-border bg-background p-4 text-sm text-destructive">
        Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
      </div>
    );
  }

  if (
    usConditionalPayment &&
    (!usAge21Confirmed || !usConditionalAck)
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Confirm the checkboxes above to verify your card for this conditional
        reservation.
      </p>
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
        <Button type="button" variant="outline" size="sm" onClick={requestRetry}>
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
      {paymentMode === "setup_intent" ? (
        <p className="text-sm text-muted-foreground">
          {usConditionalPayment
            ? "Your card will be verified and saved. You will not be charged now."
            : "Your card will be saved and charged only when the pallet ships."}
        </p>
      ) : null}
      {paymentMode === "payment_intent" ? (
        <p className="text-sm text-muted-foreground">
          Your bottles will ship within 7-14 days.
        </p>
      ) : null}
      {paymentElementLoadError ? (
        <div className="space-y-2 rounded-md border border-border bg-background p-4">
          <p className="text-sm text-destructive">{paymentElementLoadError}</p>
          <p className="text-xs text-muted-foreground">
            Often caused by a mismatch between test/live keys, an expired client
            secret, or a blocked network. Try again after verifying your Stripe
            publishable key matches the account that created the intent.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={requestRetry}>
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

