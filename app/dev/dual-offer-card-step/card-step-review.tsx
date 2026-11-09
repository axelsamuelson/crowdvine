"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  DualOfferPurchaseActions,
  buildSharedPalletBindCopy,
} from "@/components/checkout/dual-offer-checkout-panel";
import { dualOfferMsg } from "@/lib/checkout/dual-offer-customer-copy";

type Locale = "sv" | "en";

function CardStepInner(props: {
  locale: Locale;
  totalSek: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const [step, setStep] = useState<"continue" | "card">("continue");

  const bind = buildSharedPalletBindCopy({
    locale: props.locale,
    totalSek: props.totalSek,
    chargeDeadlineAt: null,
    showDirectOffer: false,
  });

  const onContinue = () => {
    setError(null);
    setStep("card");
  };

  const onBind = async () => {
    if (!stripe || !elements || !complete) return;
    setBusy(true);
    setError(null);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url:
            typeof window !== "undefined"
              ? `${window.location.origin}/dev/dual-offer-card-step?lang=${props.locale}`
              : undefined,
        },
      });
      if (result.error) {
        setError(
          result.error.message ||
            dualOfferMsg(props.locale, "dualOfferCardIncomplete"),
        );
      } else {
        setError(
          props.locale === "en"
            ? "Unexpected success — use an incomplete card for the error state."
            : "Oväntad lyckad bekräftelse — använd ett ofullständigt kort för felstatus.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(false);
    }
  };

  if (step === "continue") {
    return (
      <DualOfferPurchaseActions
        model={{
          locale: props.locale,
          variant: "continue",
          finalCtaLabel: dualOfferMsg(props.locale, "dualOfferContinueToCard"),
          totalInclLine: null,
          legalLine: null,
          disabled: false,
          confirmNote: null,
          onConfirm: onContinue,
        }}
      />
    );
  }

  return (
    <div className="space-y-4" data-testid="dual-offer-card-step-live">
      <div className="rounded-xl border border-border bg-background p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            wallets: { applePay: "never", googlePay: "never" },
          }}
          onChange={(e) => setComplete(e.complete === true)}
        />
      </div>
      <DualOfferPurchaseActions
        model={{
          locale: props.locale,
          variant: "bind",
          finalCtaLabel: bind.finalCtaLabel,
          totalInclLine: bind.totalInclLine,
          legalLine: bind.legalLine,
          disabled: !stripe || !elements || !complete || busy,
          loading: busy,
          confirmNote: !complete
            ? dualOfferMsg(props.locale, "dualOfferCardIncomplete")
            : null,
          errorNote: error,
          onConfirm: () => void onBind(),
        }}
      />
    </div>
  );
}

function StaticCardMock(props: { locale: Locale; totalSek: number }) {
  const bind = buildSharedPalletBindCopy({
    locale: props.locale,
    totalSek: props.totalSek,
    chargeDeadlineAt: null,
    showDirectOffer: false,
  });
  return (
    <div className="space-y-4" data-testid="dual-offer-card-step-mock">
      <DualOfferPurchaseActions
        model={{
          locale: props.locale,
          variant: "continue",
          finalCtaLabel: dualOfferMsg(props.locale, "dualOfferContinueToCard"),
          totalInclLine: null,
          legalLine: null,
          disabled: true,
          confirmNote: null,
          onConfirm: () => {},
        }}
      />
      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            {props.locale === "en" ? "Card number" : "Kortnummer"}
          </label>
          <div className="h-10 rounded-md border border-border bg-muted/30 px-3 text-sm leading-10 text-muted-foreground">
            4242 4242 4242
          </div>
        </div>
        <p
          className="text-sm text-destructive"
          data-testid="dual-offer-card-step-error"
          role="alert"
        >
          {props.locale === "en"
            ? "Your card number is incomplete."
            : "Kortnumret är ofullständigt."}
        </p>
      </div>
      <DualOfferPurchaseActions
        model={{
          locale: props.locale,
          variant: "bind",
          finalCtaLabel: bind.finalCtaLabel,
          totalInclLine: bind.totalInclLine,
          legalLine: bind.legalLine,
          disabled: true,
          confirmNote: dualOfferMsg(props.locale, "dualOfferCardIncomplete"),
          errorNote:
            props.locale === "en"
              ? "Your card number is incomplete."
              : "Kortnumret är ofullständigt.",
          onConfirm: () => {},
        }}
      />
    </div>
  );
}

export function DualOfferCardStepReview() {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initial = useMemo((): Locale => {
    const q = String(search.get("lang") ?? search.get("locale") ?? "sv")
      .trim()
      .toLowerCase();
    return q === "en" ? "en" : "sv";
  }, [search]);
  const [locale, setLocale] = useState<Locale>(initial);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
  const totalSek = 1283;

  useEffect(() => {
    setLocale(initial);
  }, [initial]);

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

  const setLang = (next: Locale) => {
    setLocale(next);
    const params = new URLSearchParams(search.toString());
    params.set("lang", next);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {locale === "en"
            ? "4. Payment (review)"
            : "4. Betalning (granskning)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {locale === "en"
            ? "Preview-only: continue → card → binding buy button. Matches checkout."
            : "Endast förhandsvisning: fortsätt → kort → bindande köpknapp. Speglar checkout."}
        </p>
        <div
          className="flex gap-2"
          role="group"
          aria-label="Locale"
          data-testid="dual-offer-card-step-locale"
        >
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              locale === "sv" ? "border-foreground" : "border-border"
            }`}
            onClick={() => setLang("sv")}
          >
            Svenska
          </button>
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              locale === "en" ? "border-foreground" : "border-border"
            }`}
            onClick={() => setLang("en")}
          >
            English
          </button>
        </div>
      </div>

      {!pk || loadError || !clientSecret || !stripePromise ? (
        <StaticCardMock locale={locale} totalSek={totalSek} />
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: { theme: "stripe" },
          }}
        >
          <CardStepInner locale={locale} totalSek={totalSek} />
        </Elements>
      )}
    </div>
  );
}
