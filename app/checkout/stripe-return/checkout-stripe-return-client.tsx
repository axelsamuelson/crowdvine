"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { isUiLocalizationEnabledClient } from "@/lib/localization";

type IntentType = "setup_intent" | "payment_intent";

function isSwedishLocale(): boolean {
  if (!isUiLocalizationEnabledClient()) return false;
  if (typeof document !== "undefined") {
    const lang = document.documentElement?.lang;
    if (typeof lang === "string" && lang.toLowerCase().startsWith("sv"))
      return true;
  }
  if (typeof navigator !== "undefined") {
    const l = navigator.language;
    if (typeof l === "string" && l.toLowerCase().startsWith("sv")) return true;
  }
  return false;
}

export function CheckoutStripeReturnClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  // SSR + first client paint must match (no document/navigator on server).
  const [uiIsSv, setUiIsSv] = useState(false);
  useLayoutEffect(() => {
    setUiIsSv(isSwedishLocale());
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const sv = isSwedishLocale();
      const redirectStatus = searchParams.get("redirect_status");

      const setupIntent = searchParams.get("setup_intent");
      const paymentIntent = searchParams.get("payment_intent");
      // NOTE: we intentionally ignore *_client_secret query params.

      if (redirectStatus === "failed") {
        setLoading(false);
        setError(
          sv
            ? "Din betalmetod kunde inte verifieras. Försök igen eller använd ett annat kort."
            : "Your payment method could not be verified. Please try again or use another card.",
        );
        return;
      }

      // Legacy / manual recovery: Stripe may omit redirect_status on some returns.
      // Only block known non-success; otherwise server retrieves the intent and verifies status.
      if (
        redirectStatus != null &&
        redirectStatus !== "" &&
        redirectStatus !== "succeeded"
      ) {
        setLoading(false);
        setError(
          sv
            ? "Vi kunde inte verifiera betalningen. Försök igen."
            : "We could not verify the payment. Please try again.",
        );
        return;
      }

      const intentId =
        typeof setupIntent === "string" && setupIntent.trim()
          ? setupIntent.trim()
          : typeof paymentIntent === "string" && paymentIntent.trim()
            ? paymentIntent.trim()
            : null;

      const intentType: IntentType | null =
        intentId && setupIntent
          ? "setup_intent"
          : intentId && paymentIntent
            ? "payment_intent"
            : null;

      if (!intentId || !intentType) {
        setLoading(false);
        setError(
          sv
            ? "Saknar betalningsinformation från Stripe. Gå tillbaka och försök igen."
            : "Missing payment information from Stripe. Please go back and try again.",
        );
        return;
      }

      try {
        const res = await fetch("/api/checkout/confirm-stripe-return", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intentId, intentType }),
        });

        const data: unknown = await res.json().catch(() => null);
        if (!data || typeof data !== "object") {
          if (!cancelled) {
            setLoading(false);
            setError(
              sv
                ? "Kunde inte läsa svar från servern. Försök igen."
                : "Failed to finalize checkout",
            );
          }
          return;
        }

        const d = data as {
          success?: unknown;
          redirectUrl?: unknown;
          error?: unknown;
        };
        if (
          d.success === true &&
          typeof d.redirectUrl === "string" &&
          d.redirectUrl.trim()
        ) {
          if (!cancelled) {
            window.location.href = d.redirectUrl;
          }
          return;
        }

        const msg =
          typeof d.error === "string" && d.error.trim()
            ? d.error.trim()
            : !res.ok
              ? sv
                ? "Kunde inte slutföra checkout. Försök igen."
                : "Failed to finalize checkout"
              : sv
                ? "Din betalmetod kunde inte verifieras. Försök igen eller använd ett annat kort."
                : "Your payment method could not be verified. Please try again or use another card.";
        if (!cancelled) {
          setLoading(false);
          setError(msg);
        }
        if (!res.ok) {
          const errPart =
            typeof d.error === "string" && d.error.trim()
              ? d.error.trim()
              : d.error != null
                ? JSON.stringify(d.error)
                : "(no error field)";
          // Single line: some devtools collapse object literals to "{}".
          console.error(
            `[stripe-return] confirm-stripe-return failed status=${String(res.status)} statusText=${res.statusText} error=${errPart} body=${JSON.stringify(data)}`,
          );
        }
      } catch (e) {
        console.error("[stripe-return] finalize error:", e);
        if (!cancelled) {
          setLoading(false);
          setError(
            sv
              ? "Din betalmetod kunde inte verifieras. Försök igen eller använd ett annat kort."
              : "Your payment method could not be verified. Please try again or use another card.",
          );
        }
      }
    }

    void run().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (loading && !error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md space-y-3 p-6 pt-top-spacing text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-foreground" />
          <h1 className="text-lg font-medium text-foreground">
            {uiIsSv ? "Slutför din reservation…" : "Finalizing your reservation…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {uiIsSv
              ? "Vänta medan vi verifierar betalningen."
              : "Please wait while we verify your payment."}
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-md space-y-4 p-6 pt-top-spacing text-center">
          <h1 className="text-lg font-medium text-foreground">
            {uiIsSv ? "Betalningen misslyckades" : "Payment failed"}
          </h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.replace("/checkout")}
              className="w-full"
            >
              {uiIsSv ? "Tillbaka till checkout" : "Back to checkout"}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
