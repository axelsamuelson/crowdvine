"use client";

/**
 * Dual-offer compare panel for test/preview checkout surfaces.
 * Selecting an offer is quote review — not payment consent.
 * Live payment/order mutations stay fail-closed (see dual-offer-payment-boundary).
 *
 * Inès polish (test UI only): equal comparison rows for delivery/debit,
 * non-color selected marker, diagnostics visually separated from customer-like
 * content, honest average bottle label for mixed baskets, sv-SE money format.
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
import {
  formatOfferSek,
  isMixedBottleBasket,
} from "@/lib/checkout/dual-offer-display";

export { formatOfferSek, isMixedBottleBasket } from "@/lib/checkout/dual-offer-display";

type Locale = "sv" | "en";

type Copy = {
  dualOfferBanner: string;
  dualOfferTitle: string;
  dualOfferSubtitle: string;
  dualOfferSharedTitle: string;
  dualOfferDirectTitle: string;
  dualOfferBottle: string;
  dualOfferBottleAvg: string;
  dualOfferWines: string;
  dualOfferFreight: string;
  dualOfferVatFees: string;
  dualOfferVatFeesNote: string;
  dualOfferDelivery: string;
  dualOfferDebit: string;
  dualOfferTotal: string;
  dualOfferSamplePrices: string;
  dualOfferUndecidedContract: string;
  dualOfferSyntheticBadge: string;
  dualOfferSelectedMarker: string;
  dualOfferNotSelected: string;
  dualOfferSelectionHint: string;
  dualOfferAcceptanceDistinct: string;
  dualOfferSwitchDisclosure: (parts: {
    bottleFrom: string;
    bottleTo: string;
    freightFrom: string;
    freightTo: string;
    totalFrom: string;
    totalTo: string;
    deliveryFrom: string;
    deliveryTo: string;
    debitFrom: string;
    debitTo: string;
  }) => string;
  dualOfferAcceptanceCleared: string;
  dualOfferAcceptQuote: string;
  dualOfferAccepted: string;
  dualOfferAcceptedStatus: string;
  dualOfferAwaitingAccept: string;
  dualOfferFinalBlocked: (reason: string) => string;
  dualOfferLoading: string;
  dualOfferError: string;
  dualOfferRetry: string;
  dualOfferPersistenceNote: string;
  dualOfferVsPayment: string;
  dualOfferDiagnosticsTitle: string;
  dualOfferNonPayable: string;
};

const COPY: Record<Locale, Copy> = {
  sv: {
    dualOfferBanner:
      "Test/förhandsvisning · inte livebetalning · syntetiska samplepriser",
    dualOfferTitle: "Jämför två erbjudanden",
    dualOfferSubtitle:
      "Samma varukorg och destination. Att välja erbjudande är inte betalningsmedgivande.",
    dualOfferSharedTitle: "Delad pall",
    dualOfferDirectTitle: "Direkt",
    dualOfferBottle: "Flaskpris",
    dualOfferBottleAvg: "Snittpris per flaska",
    dualOfferWines: "Viner (delsumma)",
    dualOfferFreight: "Frakt",
    dualOfferVatFees: "Moms/avgifter",
    dualOfferVatFeesNote: "Ej beslutad policy — ingen siffra",
    dualOfferDelivery: "Leveranstid",
    dualOfferDebit: "Debiteringstid",
    dualOfferTotal: "Totalt",
    dualOfferSamplePrices:
      "Samplepriser — ej beslutade marginaler eller transporttider",
    dualOfferUndecidedContract: "Kontrakt/bindning: ej beslutat",
    dualOfferSyntheticBadge: "Syntetisk · ej betalbar",
    dualOfferSelectedMarker: "Vald",
    dualOfferNotSelected: "Ej vald",
    dualOfferSelectionHint:
      "Valt erbjudande styr knappen “Acceptera valt offer-quote (granskning)” — fortfarande inte köp.",
    dualOfferAcceptanceDistinct:
      "Markering = val. Acceptans = separat steg. Köp = blockerat i denna yta.",
    dualOfferSwitchDisclosure: (p) =>
      `Bytte erbjudande · snittflaska ${p.bottleFrom} → ${p.bottleTo} · frakt ${p.freightFrom} → ${p.freightTo} · totalt ${p.totalFrom} → ${p.totalTo} · leverans: ${p.deliveryFrom} → ${p.deliveryTo} · debitering: ${p.debitFrom} → ${p.debitTo}`,
    dualOfferAcceptanceCleared:
      "Tidigare offer-acceptans ogiltig efter byte — acceptera det nya quotet igen.",
    dualOfferAcceptQuote: "Acceptera valt offer-quote (granskning)",
    dualOfferAccepted: "Offer-quote accepterat för granskning — inte köp",
    dualOfferAcceptedStatus: "Granskningsacceptans aktiv för valt quote",
    dualOfferAwaitingAccept: "Valt — väntar på explicit offer-acceptans",
    dualOfferFinalBlocked: (reason) =>
      `Slutlig betalning/order blockerad: ${reason}`,
    dualOfferLoading: "Hämtar erbjudanden…",
    dualOfferError: "Kunde inte hämta erbjudanden",
    dualOfferRetry: "Försök igen",
    dualOfferPersistenceNote:
      "Snapshot-persistens (migration 279) saknas — livebetalning fail-closed",
    dualOfferVsPayment: "Offer-granskning ≠ juridiskt bindande köp",
    dualOfferDiagnosticsTitle: "Granskningsdiagnostik (inte kundyta)",
    dualOfferNonPayable: "Ej betalbar i denna yta",
  },
  en: {
    dualOfferBanner:
      "Test/preview · not live payment · synthetic sample prices",
    dualOfferTitle: "Compare two offers",
    dualOfferSubtitle:
      "Same cart and destination. Selecting an offer is not payment consent.",
    dualOfferSharedTitle: "Shared pallet",
    dualOfferDirectTitle: "Direct",
    dualOfferBottle: "Bottle price",
    dualOfferBottleAvg: "Average bottle price",
    dualOfferWines: "Wines (subtotal)",
    dualOfferFreight: "Freight",
    dualOfferVatFees: "VAT / fees",
    dualOfferVatFeesNote: "Policy undecided — no figure",
    dualOfferDelivery: "Delivery timing",
    dualOfferDebit: "Debit timing",
    dualOfferTotal: "Total",
    dualOfferSamplePrices:
      "Sample prices — margins and transport times undecided",
    dualOfferUndecidedContract: "Contract / binding: undecided",
    dualOfferSyntheticBadge: "Synthetic · not payable",
    dualOfferSelectedMarker: "Selected",
    dualOfferNotSelected: "Not selected",
    dualOfferSelectionHint:
      "Selected offer drives the “Accept selected offer quote (review)” button — still not a purchase.",
    dualOfferAcceptanceDistinct:
      "Marker = selection. Acceptance = separate step. Purchase = blocked here.",
    dualOfferSwitchDisclosure: (p) =>
      `Switched offer · avg bottle ${p.bottleFrom} → ${p.bottleTo} · freight ${p.freightFrom} → ${p.freightTo} · total ${p.totalFrom} → ${p.totalTo} · delivery: ${p.deliveryFrom} → ${p.deliveryTo} · debit: ${p.debitFrom} → ${p.debitTo}`,
    dualOfferAcceptanceCleared:
      "Previous offer acceptance cleared after switch — accept the new quote again.",
    dualOfferAcceptQuote: "Accept selected offer quote (review)",
    dualOfferAccepted: "Offer quote accepted for review — not a purchase",
    dualOfferAcceptedStatus: "Review acceptance active for selected quote",
    dualOfferAwaitingAccept: "Selected — awaiting explicit quote acceptance",
    dualOfferFinalBlocked: (reason) =>
      `Final payment/order blocked: ${reason}`,
    dualOfferLoading: "Loading offers…",
    dualOfferError: "Could not load offers",
    dualOfferRetry: "Try again",
    dualOfferPersistenceNote:
      "Snapshot persistence (migration 279) unavailable — live payment fail-closed",
    dualOfferVsPayment: "Quote review ≠ legally binding purchase",
    dualOfferDiagnosticsTitle: "Review diagnostics (not customer UI)",
    dualOfferNonPayable: "Not payable on this surface",
  },
};

function deliveryLabel(quote: OfferQuote, locale: Locale): string {
  return locale === "sv"
    ? quote.delivery_terms.previewLabelSv
    : quote.delivery_terms.previewLabelEn;
}

function debitLabel(quote: OfferQuote, locale: Locale): string {
  return locale === "sv"
    ? quote.debit_timing.previewLabelSv
    : quote.debit_timing.previewLabelEn;
}

function CompareRow(props: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        props.emphasize ? "text-base font-semibold" : "text-sm font-medium text-foreground"
      }`}
    >
      <dt className="shrink-0">{props.label}</dt>
      <dd className="text-right tabular-nums leading-snug">{props.value}</dd>
    </div>
  );
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
  const mixed = isMixedBottleBasket(quote);
  const bottleLabel = mixed ? copy.dualOfferBottleAvg : copy.dualOfferBottle;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      disabled={unavailable || props.disabled}
      onClick={props.onSelect}
      data-testid={`dual-offer-card-${quote.offer}`}
      data-selected={props.selected ? "true" : "false"}
      className={`w-full text-left rounded-lg border-2 p-4 transition font-sans ${
        props.selected
          ? "border-foreground bg-background shadow-[inset_0_0_0_1px_currentColor]"
          : "border-dashed border-muted-foreground/40 bg-background"
      } ${unavailable || props.disabled ? "opacity-50 cursor-not-allowed" : "hover:border-foreground/50"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden
            data-testid={`dual-offer-marker-${quote.offer}`}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ${
              props.selected
                ? "border-foreground bg-foreground text-background"
                : "border-muted-foreground/50 bg-background text-transparent"
            }`}
          >
            {props.selected ? "✓" : ""}
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight">
              {props.title}
            </h3>
            <p
              className="text-xs font-semibold uppercase tracking-wide mt-0.5"
              data-testid={`dual-offer-selected-label-${quote.offer}`}
            >
              {props.selected
                ? `▶ ${copy.dualOfferSelectedMarker}`
                : copy.dualOfferNotSelected}
            </p>
          </div>
        </div>
        {quote.pricing_source === "synthetic_fixture" ? (
          <span className="shrink-0 rounded border border-amber-800/40 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            {copy.dualOfferSyntheticBadge}
          </span>
        ) : null}
      </div>

      {unavailable ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {quote.unavailable_reason}
        </p>
      ) : (
        <dl className="mt-3 space-y-2.5">
          <CompareRow
            label={bottleLabel}
            value={formatOfferSek(quote.bottle_unit_price_sek, locale)}
          />
          <CompareRow
            label={copy.dualOfferWines}
            value={formatOfferSek(quote.wines_subtotal_sek, locale)}
          />
          <CompareRow
            label={copy.dualOfferFreight}
            value={formatOfferSek(quote.shipping_sek, locale)}
          />
          <CompareRow
            label={copy.dualOfferVatFees}
            value={copy.dualOfferVatFeesNote}
          />
          <CompareRow
            label={copy.dualOfferDelivery}
            value={deliveryLabel(quote, locale)}
          />
          <CompareRow
            label={copy.dualOfferDebit}
            value={debitLabel(quote, locale)}
          />
          <div className="pt-2 border-t border-border">
            <CompareRow
              label={copy.dualOfferTotal}
              value={formatOfferSek(quote.total_sek, locale)}
              emphasize
            />
          </div>
          <p className="text-xs font-medium text-amber-950 dark:text-amber-100 pt-1">
            {copy.dualOfferSamplePrices}
          </p>
          <p className="text-xs text-foreground">{copy.dualOfferUndecidedContract}</p>
          <p className="text-xs font-semibold text-foreground">
            {copy.dualOfferNonPayable}
          </p>
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
  const [acceptanceNote, setAcceptanceNote] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const publish = useCallback(
    (next: OfferCheckoutSessionState) => {
      setState(next);
      props.onStateChange?.(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStateChange via props ref pattern
    [props.onStateChange],
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
          const hadAcceptance = Boolean(prev.acceptance);
          const next = reconcileAcceptanceAfterRecompute({
            state: prev,
            nextDual: j.dual,
          });
          if (hadAcceptance && !next.acceptance) {
            setAcceptanceNote(copy.dualOfferAcceptanceCleared);
          }
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
    copy.dualOfferAcceptanceCleared,
    onStateChange,
  ]);

  const onSelect = useCallback(
    (offer: "shared_pallet" | "direct_box") => {
      if (!state) return;
      const hadAcceptance = Boolean(state.acceptance);
      const from =
        state.dual.selected_offer === "shared_pallet"
          ? state.dual.shared_pallet
          : state.dual.direct_box;
      const result = switchSelectedOffer({
        state,
        toOffer: offer,
        openIntentIds: props.openIntentIds,
      });
      publish(result.state);
      const to =
        offer === "shared_pallet"
          ? result.state.dual.shared_pallet
          : result.state.dual.direct_box;
      if (result.disclosure.ok && to) {
        setDisclosure(
          copy.dualOfferSwitchDisclosure({
            bottleFrom: formatOfferSek(
              result.disclosure.bottle_unit_price_from,
              locale,
            ),
            bottleTo: formatOfferSek(
              result.disclosure.bottle_unit_price_to,
              locale,
            ),
            freightFrom: formatOfferSek(from?.shipping_sek ?? null, locale),
            freightTo: formatOfferSek(to.shipping_sek, locale),
            totalFrom: formatOfferSek(
              result.disclosure.total_from_sek,
              locale,
            ),
            totalTo: formatOfferSek(result.disclosure.total_to_sek, locale),
            deliveryFrom: from ? deliveryLabel(from, locale) : "—",
            deliveryTo: deliveryLabel(to, locale),
            debitFrom: from ? debitLabel(from, locale) : "—",
            debitTo: debitLabel(to, locale),
          }),
        );
      } else {
        setDisclosure(result.disclosure.reason);
      }
      if (hadAcceptance) {
        setAcceptanceNote(copy.dualOfferAcceptanceCleared);
      } else {
        setAcceptanceNote(copy.dualOfferAwaitingAccept);
      }
    },
    [state, props.openIntentIds, publish, copy, locale],
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
      setAcceptanceNote(copy.dualOfferAcceptedStatus);
    } else {
      setDisclosure(result.reason);
      publish(result.state);
      setAcceptanceNote(result.reason);
    }
  }, [state, publish, copy]);

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

  const selectedTitle =
    state?.dual.selected_offer === "direct_box"
      ? copy.dualOfferDirectTitle
      : state?.dual.selected_offer === "shared_pallet"
        ? copy.dualOfferSharedTitle
        : "—";

  const quoteIds = [
    state?.dual.shared_pallet?.quote_id,
    state?.dual.direct_box?.quote_id,
  ].filter(Boolean);

  return (
    <section
      className={`space-y-4 font-sans ${props.className ?? ""}`}
      data-testid="dual-offer-checkout-panel"
      aria-labelledby="dual-offer-heading"
    >
      {/* Customer-like panel */}
      <div
        className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5"
        data-testid="dual-offer-customer-panel"
      >
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-950 dark:text-amber-100">
            {copy.dualOfferBanner}
          </p>
          <h2
            id="dual-offer-heading"
            className="text-lg font-semibold text-foreground tracking-tight"
          >
            {copy.dualOfferTitle}
          </h2>
          <p className="text-sm text-foreground/80">{copy.dualOfferSubtitle}</p>
          <p className="text-sm font-medium text-foreground">
            {copy.dualOfferVsPayment}
          </p>
          <p className="text-xs text-foreground">{copy.dualOfferAcceptanceDistinct}</p>
        </header>

        {loading ? (
          <p
            className="text-sm text-foreground"
            data-testid="dual-offer-loading"
          >
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
            <div
              className="grid gap-4 sm:grid-cols-2"
              role="radiogroup"
              aria-label={copy.dualOfferTitle}
            >
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

            <p
              className="text-sm font-medium text-foreground"
              data-testid="dual-offer-selection-hint"
            >
              {copy.dualOfferSelectionHint} ({selectedTitle})
            </p>

            {disclosure ? (
              <p
                className="text-sm rounded-md border border-foreground/20 bg-muted/30 p-3 text-foreground"
                data-testid="dual-offer-disclosure"
              >
                {disclosure}
              </p>
            ) : null}

            {acceptanceNote ? (
              <p
                className="text-sm font-semibold rounded-md border border-dashed border-foreground/40 px-3 py-2"
                data-testid="dual-offer-acceptance-status"
              >
                {acceptanceNote}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                data-testid="dual-offer-accept"
                className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
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
                className="rounded-xl border-2 border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
                disabled={!liveGate.allow}
                title={liveGate.reason ?? finalGate.reason ?? undefined}
              >
                Pay / Reserve ({copy.dualOfferNonPayable})
              </button>
            </div>
            <p
              className="text-xs text-foreground/70"
              data-testid="dual-offer-final-reason"
            >
              {copy.dualOfferFinalBlocked(
                liveGate.reason ?? finalGate.reason ?? "blocked",
              )}
            </p>
          </>
        ) : null}
      </div>

      {/* Review diagnostics — visually separate from customer-like panel */}
      <aside
        className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-3 space-y-1.5 font-mono text-[11px] text-muted-foreground"
        data-testid="dual-offer-review-diagnostics"
        aria-label={copy.dualOfferDiagnosticsTitle}
      >
        <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.dualOfferDiagnosticsTitle}
        </p>
        <p>{copy.dualOfferPersistenceNote}</p>
        {!OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE ? (
          <p>OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE=false</p>
        ) : null}
        {liveGate.reviewNote ? <p>{liveGate.reviewNote}</p> : null}
        {quoteIds.map((id) => (
          <p key={id} className="break-all">
            quote_id={id}
          </p>
        ))}
        {state?.acceptance?.quote_id ? (
          <p className="break-all">
            accepted_quote_id={state.acceptance.quote_id}
          </p>
        ) : (
          <p>accepted_quote_id=(none)</p>
        )}
        {state?.invalidated_intent_ids?.length ? (
          <p>invalidated_intents={state.invalidated_intent_ids.join(",")}</p>
        ) : null}
      </aside>
    </section>
  );
}

/** @deprecated Prefer DualOfferCheckoutPanel — kept for /dev page import stability. */
export { DualOfferCheckoutPanel as DualOfferComparePreview };
