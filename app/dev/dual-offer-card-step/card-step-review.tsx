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
import {
  sharedPalletLinkEnabled,
  sharedPalletPaymentElementOptions,
} from "@/lib/checkout/shared-pallet-stripe-link";

type Locale = "sv" | "en";

const pactDevAppearance = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#0A0A0A",
    colorBackground: "#ffffff",
    colorText: "#0A0A0A",
    colorTextSecondary: "#666666",
    fontFamily: "Geist, ui-sans-serif, sans-serif",
    borderRadius: "6px",
  },
};

function CardStepInner(props: {
  locale: Locale;
  totalSek: number;
  forceError: boolean;
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

  const peOptions = sharedPalletPaymentElementOptions({
    linkEnabled: sharedPalletLinkEnabled(),
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
      if (props.forceError) {
        setError(
          props.locale === "en"
            ? "Your card number is incomplete."
            : "Kortnumret är ofullständigt.",
        );
        return;
      }
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

  const showError =
    error ||
    (props.forceError
      ? props.locale === "en"
        ? "Your card number is incomplete."
        : "Kortnumret är ofullständigt."
      : null);

  return (
    <div className="space-y-4" data-testid="dual-offer-card-step-live">
      <p className="text-xs text-muted-foreground" data-testid="dev-link-enabled">
        link_enabled={String(sharedPalletLinkEnabled())}
      </p>
      <div className="rounded-xl border border-border bg-background p-4">
        <PaymentElement
          options={{
            layout: {
              type: "accordion",
              defaultCollapsed: false,
              radios: true,
              spacedAccordionItems: false,
            },
            ...peOptions,
          }}
          onChange={(e) => setComplete(e.complete === true)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {props.locale === "en"
          ? "Seller: EURPACT OÜ (reg. 17538270), Estonia"
          : "Avtalspart: EURPACT OÜ (reg. 17538270), Estland"}
      </p>
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
          errorNote: showError,
          onConfirm: () => void onBind(),
        }}
      />
    </div>
  );
}

function StaticCardMock(props: {
  locale: Locale;
  totalSek: number;
  forceError: boolean;
}) {
  const bind = buildSharedPalletBindCopy({
    locale: props.locale,
    totalSek: props.totalSek,
    chargeDeadlineAt: null,
    showDirectOffer: false,
  });
  const err =
    props.locale === "en"
      ? "Your card number is incomplete."
      : "Kortnumret är ofullständigt.";
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
        {props.forceError ? (
          <p
            className="text-sm text-destructive"
            data-testid="dual-offer-card-step-error"
            role="alert"
          >
            {err}
          </p>
        ) : null}
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
          errorNote: props.forceError ? err : null,
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
  const [forceError, setForceError] = useState(
    () => search.get("error") === "1" || search.get("error") === "true",
  );
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

  const toggleError = () => {
    const next = !forceError;
    setForceError(next);
    const params = new URLSearchParams(search.toString());
    if (next) params.set("error", "1");
    else params.delete("error");
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">
          {locale === "en" ? "4. Card (review)" : "4. Betalkort (granskning)"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {locale === "en"
            ? "Preview-only: continue → Payment Element (card-only, Link off) → binding buy. Toggle error for screenshots."
            : "Endast förhandsvisning: fortsätt → Payment Element (endast kort, Link av) → bindande köp. Växla fel för skärmdumpar."}
        </p>
        <div className="flex flex-wrap gap-2">
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
          <button
            type="button"
            className={`rounded-md border px-3 py-1.5 text-sm ${
              forceError ? "border-destructive text-destructive" : "border-border"
            }`}
            data-testid="dual-offer-card-step-error-toggle"
            onClick={toggleError}
          >
            {forceError
              ? locale === "en"
                ? "Error: on"
                : "Fel: på"
              : locale === "en"
                ? "Error: off"
                : "Fel: av"}
          </button>
        </div>
      </div>

      {!pk || loadError || !clientSecret || !stripePromise ? (
        <StaticCardMock
          locale={locale}
          totalSek={totalSek}
          forceError={forceError}
        />
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: pactDevAppearance,
            fonts: [
              {
                cssSrc:
                  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap",
              },
            ],
          }}
        >
          <CardStepInner
            locale={locale}
            totalSek={totalSek}
            forceError={forceError}
          />
        </Elements>
      )}
    </div>
  );
}
