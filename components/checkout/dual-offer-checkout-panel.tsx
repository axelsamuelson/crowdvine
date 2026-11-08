"use client";

/**
 * Dual-offer compare panel for test/preview checkout surfaces.
 * Selecting an offer is quote review — not payment consent.
 * Live payment/order mutations stay fail-closed (see dual-offer-payment-boundary).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DualOfferQuoteSet,
  OfferQuote,
} from "@/lib/checkout/offer-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
  mayEnableFinalCheckoutAction,
  reconcileAcceptanceAfterRecompute,
  switchSelectedOffer,
  type OfferCheckoutSessionState,
} from "@/lib/checkout/offer-acceptance";
import {
  evaluateDualOfferLivePaymentGate,
  OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE,
} from "@/lib/checkout/dual-offer-payment-boundary";

type Locale = "sv" | "en";

type Copy = {
  dualOfferBanner: string;
  dualOfferTitle: string;
  dualOfferSubtitle: string;
  dualOfferSharedTitle: string;
  dualOfferDirectTitle: string;
  dualOfferBottle: string;
  dualOfferWines: string;
  dualOfferFreight: string;
  dualOfferVatFees: string;
  dualOfferVatFeesNote: string;
  dualOfferTotal: string;
  dualOfferSamplePrices: string;
  dualOfferUndecidedContract: string;
  dualOfferSyntheticBadge: string;
  dualOfferSwitchDisclosure: (
    from: string,
    to: string,
    totalFrom: string,
    totalTo: string,
  ) => string;
  dualOfferAcceptQuote: string;
  dualOfferAccepted: string;
  dualOfferFinalBlocked: (reason: string) => string;
  dualOfferLoading: string;
  dualOfferError: string;
  dualOfferRetry: string;
  dualOfferPersistenceNote: string;
  dualOfferVsPayment: string;
};

const COPY: Record<Locale, Copy> = {
  sv: {
    dualOfferBanner:
      "Förhandsvisning · två erbjudanden · endast test/preview · inte livebetalning",
    dualOfferTitle: "Jämför två erbjudanden",
    dualOfferSubtitle:
      "Samma varukorg och destination. Att välja erbjudande är inte betalningsmedgivande.",
    dualOfferSharedTitle: "Delad pall",
    dualOfferDirectTitle: "Direkt",
    dualOfferBottle: "Flaskpris",
    dualOfferWines: "Viner (delsumma)",
    dualOfferFreight: "Frakt",
    dualOfferVatFees: "Moms/avgifter",
    dualOfferVatFeesNote: "Ingår i samplepriser / ej beslutat",
    dualOfferTotal: "Totalt",
    dualOfferSamplePrices:
      "Samplepriser — ej beslutade marginaler eller transporttider",
    dualOfferUndecidedContract: "Kontrakt/bindning: ej beslutat",
    dualOfferSyntheticBadge: "Syntetisk förhandsvisning",
    dualOfferSwitchDisclosure: (from, to, totalFrom, totalTo) =>
      `Flaskpris ${from} → ${to} SEK · Totalt ${totalFrom} → ${totalTo} SEK`,
    dualOfferAcceptQuote: "Acceptera valt offer-quote (granskning)",
    dualOfferAccepted: "Offer-quote accepterat för granskning — inte köp",
    dualOfferFinalBlocked: (reason) =>
      `Slutlig betalning/order blockerad: ${reason}`,
    dualOfferLoading: "Hämtar erbjudanden…",
    dualOfferError: "Kunde inte hämta erbjudanden",
    dualOfferRetry: "Försök igen",
    dualOfferPersistenceNote:
      "Snapshot-persistens (migration 279) saknas — livebetalning fail-closed",
    dualOfferVsPayment: "Offer-granskning ≠ juridiskt bindande köp",
  },
  en: {
    dualOfferBanner:
      "Preview · two offers · test/preview only · not live payment",
    dualOfferTitle: "Compare two offers",
    dualOfferSubtitle:
      "Same cart and destination. Selecting an offer is not payment consent.",
    dualOfferSharedTitle: "Shared pallet",
    dualOfferDirectTitle: "Direct",
    dualOfferBottle: "Bottle price",
    dualOfferWines: "Wines (subtotal)",
    dualOfferFreight: "Freight",
    dualOfferVatFees: "VAT / fees",
    dualOfferVatFeesNote: "Included in sample prices / undecided",
    dualOfferTotal: "Total",
    dualOfferSamplePrices:
      "Sample prices — margins and transport times undecided",
    dualOfferUndecidedContract: "Contract / binding: undecided",
    dualOfferSyntheticBadge: "Synthetic preview",
    dualOfferSwitchDisclosure: (from, to, totalFrom, totalTo) =>
      `Bottle ${from} → ${to} SEK · Total ${totalFrom} → ${totalTo} SEK`,
    dualOfferAcceptQuote: "Accept selected offer quote (review)",
    dualOfferAccepted: "Offer quote accepted for review — not a purchase",
    dualOfferFinalBlocked: (reason) =>
      `Final payment/order blocked: ${reason}`,
    dualOfferLoading: "Loading offers…",
    dualOfferError: "Could not load offers",
    dualOfferRetry: "Try again",
    dualOfferPersistenceNote:
      "Snapshot persistence (migration 279) unavailable — live payment fail-closed",
    dualOfferVsPayment: "Quote review ≠ legally binding purchase",
  },
};

function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(2);
}

function OfferCard(props: {
  title: string;
  quote: OfferQuote | null;
  selected: boolean;
  onSelect: () => void;
  locale: Locale;
  copy: Copy;
  disabled?: boolean;
}) {
  const { quote, locale, copy } = props;
  if (!quote) {
    return (
      <div className="rounded-lg border border-border p-4 opacity-60 font-sans">
        <h3 className="font-semibold">{props.title}</h3>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }
  const unavailable = Boolean(quote.unavailable_reason);
  const terms =
    locale === "sv"
      ? quote.delivery_terms.previewLabelSv
      : quote.delivery_terms.previewLabelEn;
  const debit =
    locale === "sv"
      ? quote.debit_timing.previewLabelSv
      : quote.debit_timing.previewLabelEn;

  return (
    <button
      type="button"
      disabled={unavailable || props.disabled}
      onClick={props.onSelect}
      data-testid={`dual-offer-card-${quote.offer}`}
      className={`w-full text-left rounded-lg border p-4 transition font-sans ${
        props.selected
          ? "border-foreground ring-1 ring-foreground"
          : "border-border"
      } ${unavailable || props.disabled ? "opacity-50 cursor-not-allowed" : "hover:border-foreground/40"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-base">{props.title}</h3>
        {quote.pricing_source === "synthetic_fixture" ? (
          <span className="text-[10px] uppercase tracking-wide text-amber-800 dark:text-amber-200">
            {copy.dualOfferSyntheticBadge}
          </span>
        ) : null}
      </div>
      {unavailable ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {quote.unavailable_reason}
        </p>
      ) : (
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-base">
            <dt className="font-medium">{copy.dualOfferBottle}</dt>
            <dd className="tabular-nums font-medium">
              {fmt(quote.bottle_unit_price_sek)} SEK
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-base">
            <dt className="font-medium">{copy.dualOfferWines}</dt>
            <dd className="tabular-nums font-medium">
              {fmt(quote.wines_subtotal_sek)} SEK
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-base">
            <dt className="font-medium">{copy.dualOfferFreight}</dt>
            <dd className="tabular-nums font-medium">
              {fmt(quote.shipping_sek)} SEK
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-base">
            <dt className="font-medium">{copy.dualOfferVatFees}</dt>
            <dd className="text-right text-muted-foreground text-sm max-w-[55%]">
              {copy.dualOfferVatFeesNote}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-lg font-semibold pt-2 border-t border-border">
            <dt>{copy.dualOfferTotal}</dt>
            <dd className="tabular-nums">{fmt(quote.total_sek)} SEK</dd>
          </div>
          <div className="pt-2 space-y-1 text-muted-foreground">
            <p>{terms}</p>
            <p>{debit}</p>
            <p className="text-xs">{copy.dualOfferUndecidedContract}</p>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {copy.dualOfferSamplePrices}
            </p>
            <p className="text-[10px] font-mono text-muted-foreground/80 break-all">
              quote_id={quote.quote_id}
            </p>
          </div>
        </dl>
      )}
    </button>
  );
}

export type DualOfferCheckoutPanelProps = {
  locale?: Locale;
  /** Static dual set (dev fixture). When fetchArgs set, server payload preferred. */
  initialDual?: DualOfferQuoteSet | null;
  /** Fetch live/test offer-quotes (allow_synthetic_direct for review). */
  fetchArgs?: {
    palletId: string;
    countryCode?: string | null;
    allowSyntheticDirect?: boolean;
  } | null;
  /** Open Stripe intent ids to invalidate on switch (ids only). */
  openIntentIds?: string[];
  onStateChange?: (state: OfferCheckoutSessionState) => void;
  className?: string;
};

export function DualOfferCheckoutPanel(props: DualOfferCheckoutPanelProps) {
  const locale = props.locale ?? "sv";
  const copy = COPY[locale];
  const requestGen = useRef(0);
  const [loading, setLoading] = useState(Boolean(props.fetchArgs));
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<OfferCheckoutSessionState | null>(() =>
    props.initialDual
      ? createOfferCheckoutSessionState(props.initialDual)
      : null,
  );
  const [disclosure, setDisclosure] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const publish = useCallback(
    (next: OfferCheckoutSessionState) => {
      setState(next);
      props.onStateChange?.(next);
    },
    [props],
  );

  const onStateChange = props.onStateChange;
  const fetchPalletId = props.fetchArgs?.palletId;
  const fetchCountry = props.fetchArgs?.countryCode;
  const fetchSynthetic = props.fetchArgs?.allowSyntheticDirect;
  const initialDual = props.initialDual;

  useEffect(() => {
    if (!fetchPalletId) {
      if (initialDual) {
        const next = createOfferCheckoutSessionState(initialDual);
        setState(next);
        onStateChange?.(next);
        setLoading(false);
        setError(null);
      }
      return;
    }
    const gen = ++requestGen.current;
    setLoading(true);
    setError(null);
    const body = {
      pallet_id: fetchPalletId,
      country_code: fetchCountry ?? undefined,
      allow_synthetic_direct: fetchSynthetic !== false,
    };
    void fetch("/api/checkout/offer-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (gen !== requestGen.current) return;
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            error?: string;
            code?: string;
          } | null;
          throw new Error(j?.code || j?.error || `http_${res.status}`);
        }
        const j = (await res.json()) as { dual: DualOfferQuoteSet };
        if (gen !== requestGen.current) return;
        setState((prev) => {
          if (!prev) {
            const next = createOfferCheckoutSessionState(j.dual);
            onStateChange?.(next);
            return next;
          }
          const next = reconcileAcceptanceAfterRecompute({
            state: prev,
            nextDual: j.dual,
          });
          onStateChange?.(next);
          return next;
        });
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (gen !== requestGen.current) return;
        setError(e instanceof Error ? e.message : copy.dualOfferError);
        setLoading(false);
      });
  }, [
    fetchPalletId,
    fetchCountry,
    fetchSynthetic,
    initialDual,
    reloadToken,
    copy.dualOfferError,
    onStateChange,
  ]);

  const onSelect = useCallback(
    (offer: "shared_pallet" | "direct_box") => {
      if (!state) return;
      const result = switchSelectedOffer({
        state,
        toOffer: offer,
        openIntentIds: props.openIntentIds,
      });
      publish(result.state);
      if (result.disclosure.ok) {
        setDisclosure(
          copy.dualOfferSwitchDisclosure(
            fmt(result.disclosure.bottle_unit_price_from),
            fmt(result.disclosure.bottle_unit_price_to),
            fmt(result.disclosure.total_from_sek),
            fmt(result.disclosure.total_to_sek),
          ),
        );
      } else {
        setDisclosure(result.disclosure.reason);
      }
    },
    [state, props.openIntentIds, publish, copy],
  );

  const onAccept = useCallback(() => {
    if (!state?.dual.selected_quote_id) return;
    const result = acceptSelectedOfferQuote({
      state,
      quote_id: state.dual.selected_quote_id,
    });
    if (result.ok) {
      publish(result.state);
      setDisclosure(copy.dualOfferAccepted);
    } else {
      setDisclosure(result.reason);
      publish(result.state);
    }
  }, [state, publish, copy.dualOfferAccepted]);

  const finalGate = state
    ? mayEnableFinalCheckoutAction(state)
    : { allow: false, reason: "no_state" };
  const liveGate = state
    ? evaluateDualOfferLivePaymentGate({ state })
    : {
        allow: false,
        reason: "no_state",
        reviewNote: null,
      };

  return (
    <section
      className={`space-y-4 font-sans ${props.className ?? ""}`}
      data-testid="dual-offer-checkout-panel"
      aria-labelledby="dual-offer-heading"
    >
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-200">
          {copy.dualOfferBanner}
        </p>
        <h2
          id="dual-offer-heading"
          className="text-base font-semibold text-foreground"
        >
          {copy.dualOfferTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{copy.dualOfferSubtitle}</p>
        <p className="text-xs font-medium text-foreground">
          {copy.dualOfferVsPayment}
        </p>
        {!OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE ? (
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {copy.dualOfferPersistenceNote}
          </p>
        ) : null}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground" data-testid="dual-offer-loading">
          {copy.dualOfferLoading}
        </p>
      ) : null}

      {error ? (
        <div className="space-y-2" data-testid="dual-offer-error">
          <p className="text-sm text-destructive">
            {copy.dualOfferError}: {error}
          </p>
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1.5 text-sm"
            onClick={() => setReloadToken((n) => n + 1)}
          >
            {copy.dualOfferRetry}
          </button>
        </div>
      ) : null}

      {state && !loading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <OfferCard
              title={copy.dualOfferSharedTitle}
              quote={state.dual.shared_pallet}
              selected={state.dual.selected_offer === "shared_pallet"}
              onSelect={() => onSelect("shared_pallet")}
              locale={locale}
              copy={copy}
            />
            <OfferCard
              title={copy.dualOfferDirectTitle}
              quote={state.dual.direct_box}
              selected={state.dual.selected_offer === "direct_box"}
              onSelect={() => onSelect("direct_box")}
              locale={locale}
              copy={copy}
            />
          </div>

          {disclosure ? (
            <p
              className="text-sm rounded-md border border-border bg-muted/40 p-3"
              data-testid="dual-offer-disclosure"
            >
              {disclosure}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-testid="dual-offer-accept"
              className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={
                !state.dual.selected_quote_id ||
                state.acceptance?.quote_id === state.dual.selected_quote_id
              }
              onClick={onAccept}
            >
              {copy.dualOfferAcceptQuote}
            </button>
            <button
              type="button"
              data-testid="dual-offer-final"
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
              disabled={!liveGate.allow}
              title={liveGate.reason ?? finalGate.reason ?? undefined}
            >
              Pay / Reserve (blocked)
            </button>
          </div>
          <p
            className="text-xs text-muted-foreground"
            data-testid="dual-offer-final-reason"
          >
            {copy.dualOfferFinalBlocked(
              liveGate.reason ?? finalGate.reason ?? "blocked",
            )}
            {liveGate.reviewNote ? ` — ${liveGate.reviewNote}` : ""}
          </p>
        </>
      ) : null}
    </section>
  );
}

/** @deprecated Prefer DualOfferCheckoutPanel — kept for /dev page import stability. */
export { DualOfferCheckoutPanel as DualOfferComparePreview };
