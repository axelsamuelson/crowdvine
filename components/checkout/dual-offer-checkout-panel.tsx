"use client";

/**
 * Customer-facing dual-offer compare panel (preview/test when flag allows).
 * Selecting an offer drives the quote; the final CTA carries explicit
 * acceptance of the selected quote_id (fail-closed on mismatch/expiry).
 * Live payment/order stays blocked in this build — human copy only.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DualOfferQuoteSet,
  OfferQuote,
} from "@/lib/checkout/offer-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
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
} from "@/lib/checkout/dual-offer-display";
import {
  dualOfferMsg,
  humanizeDualOfferBlockReason,
  offerBottleAverageLabelKey,
  offerTotalsIncludeVat,
  selectedOfferConfirmHint,
  type DualOfferUiLocale,
} from "@/lib/checkout/dual-offer-customer-copy";

export { formatOfferSek } from "@/lib/checkout/dual-offer-display";

type Locale = DualOfferUiLocale;

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

function OfferRowSkeleton() {
  return (
    <div
      className="w-full rounded-lg border-2 border-border/60 bg-muted/30 p-3 animate-pulse"
      data-testid="dual-offer-row-skeleton"
      aria-hidden
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
          <div className="h-4 w-24 rounded bg-muted-foreground/20" />
        </div>
        <div className="h-6 w-28 rounded bg-muted-foreground/20" />
      </div>
      <div className="mt-2 space-y-1.5 pl-7">
        <div className="h-3 w-4/5 max-w-[220px] rounded bg-muted-foreground/15" />
        <div className="h-3 w-3/5 max-w-[180px] rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

function OfferRow(props: {
  title: string;
  quote: OfferQuote | null;
  selected: boolean;
  onSelect: () => void;
  locale: Locale;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  disabled?: boolean;
}) {
  const { quote, locale } = props;
  if (!quote) {
    return (
      <div className="rounded-lg border border-border p-3 opacity-60 font-sans">
        <h3 className="font-semibold text-sm">{props.title}</h3>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }
  const unavailable = Boolean(quote.unavailable_reason);
  const bottleLabel = dualOfferMsg(locale, offerBottleAverageLabelKey());
  const showDetails = props.selected || props.detailsOpen;
  const totalSuffix = offerTotalsIncludeVat()
    ? ` ${dualOfferMsg(locale, "dualOfferInclVat")}`
    : "";

  return (
    <div
      className={`w-full rounded-lg border-2 transition font-sans ${
        props.selected
          ? "border-foreground bg-background shadow-[inset_0_0_0_1px_currentColor]"
          : "border-border bg-background"
      } ${unavailable || props.disabled ? "opacity-50" : ""}`}
      data-testid={`dual-offer-card-${quote.offer}`}
      data-selected={props.selected ? "true" : "false"}
    >
      <button
        type="button"
        role="radio"
        aria-checked={props.selected}
        disabled={unavailable || props.disabled}
        onClick={props.onSelect}
        className={`w-full text-left p-3 ${
          unavailable || props.disabled
            ? "cursor-not-allowed"
            : "hover:bg-muted/20"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
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
            <h3 className="font-semibold text-base leading-tight truncate">
              {props.title}
            </h3>
          </div>
          {!unavailable ? (
            <p
              className="shrink-0 text-lg font-semibold tabular-nums leading-none text-right"
              data-testid={`dual-offer-total-${quote.offer}`}
            >
              {formatOfferSek(quote.total_sek, locale)}
            </p>
          ) : null}
        </div>

        {unavailable ? (
          <p className="mt-2 text-sm text-muted-foreground pl-7">
            {quote.unavailable_reason}
          </p>
        ) : (
          <div className="mt-2 space-y-1 pl-7 text-sm text-foreground/85">
            <p data-testid={`dual-offer-delivery-${quote.offer}`}>
              <span className="text-muted-foreground">
                {dualOfferMsg(locale, "dualOfferDelivery")}:{" "}
              </span>
              {deliveryLabel(quote, locale)}
            </p>
            <p data-testid={`dual-offer-debit-${quote.offer}`}>
              <span className="text-muted-foreground">
                {dualOfferMsg(locale, "dualOfferDebit")}:{" "}
              </span>
              {debitLabel(quote, locale)}
            </p>
          </div>
        )}
      </button>

      {!unavailable ? (
        <div className="px-3 pb-3 pl-10">
          {!props.selected ? (
            <button
              type="button"
              className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
              data-testid={`dual-offer-details-toggle-${quote.offer}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onToggleDetails();
              }}
            >
              {props.detailsOpen
                ? dualOfferMsg(locale, "dualOfferHideDetails")
                : dualOfferMsg(locale, "dualOfferShowDetails")}
            </button>
          ) : null}

          {showDetails ? (
            <dl
              className="mt-2 space-y-1.5 text-sm"
              data-testid={`dual-offer-details-${quote.offer}`}
            >
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{bottleLabel}</dt>
                <dd className="tabular-nums font-medium">
                  {formatOfferSek(quote.bottle_unit_price_sek, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {dualOfferMsg(locale, "dualOfferWines")}
                </dt>
                <dd className="tabular-nums font-medium">
                  {formatOfferSek(quote.wines_subtotal_sek, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">
                  {dualOfferMsg(locale, "dualOfferFreight")}
                </dt>
                <dd className="tabular-nums font-medium">
                  {formatOfferSek(quote.shipping_sek, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 pt-1 border-t border-border">
                <dt className="font-semibold">
                  {dualOfferMsg(locale, "dualOfferTotal")}
                  {totalSuffix}
                </dt>
                <dd className="tabular-nums font-semibold">
                  {formatOfferSek(quote.total_sek, locale)}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
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
  /** Review-only diagnostics (/dev). Never on customer checkout. */
  showDiagnostics?: boolean;
  className?: string;
};

export function DualOfferCheckoutPanel(props: DualOfferCheckoutPanelProps) {
  const locale = props.locale ?? "sv";
  const showDiagnostics = props.showDiagnostics === true;
  const requestGen = useRef(0);
  const [loading, setLoading] = useState(Boolean(props.fetchArgs));
  const [error, setError] = useState(false);
  const [state, setState] = useState<OfferCheckoutSessionState | null>(() =>
    props.initialDual
      ? createOfferCheckoutSessionState(props.initialDual)
      : null,
  );
  const [confirmNote, setConfirmNote] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState<{
    shared_pallet: boolean;
    direct_box: boolean;
  }>({ shared_pallet: false, direct_box: false });

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
        setError(false);
      }
      return;
    }
    const gen = ++requestGen.current;
    setLoading(true);
    setError(false);
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
          throw new Error("fetch_failed");
        }
        const j = (await res.json()) as { dual: DualOfferQuoteSet };
        if (gen !== requestGen.current) return;
        setState((prev) => {
          if (!prev) {
            // Do not auto-select an offer — customer must choose.
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
      .catch(() => {
        if (gen !== requestGen.current) return;
        // Never auto-select another offer on error — keep prior state as-is.
        setError(true);
        setLoading(false);
      });
  }, [
    fetchPalletId,
    fetchCountry,
    fetchSynthetic,
    initialDual,
    reloadToken,
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
      setConfirmNote(null);
      setDetailsOpen((d) => ({
        ...d,
        [offer]: true,
        ...(offer === "shared_pallet"
          ? { direct_box: false }
          : { shared_pallet: false }),
      }));
    },
    [state, props.openIntentIds, publish],
  );

  const selectedQuote: OfferQuote | null = state?.dual.selected_offer
    ? state.dual.selected_offer === "direct_box"
      ? state.dual.direct_box
      : state.dual.shared_pallet
    : null;

  const onFinalConfirm = useCallback(() => {
    if (!state?.dual.selected_quote_id || !selectedQuote) return;
    const result = acceptSelectedOfferQuote({
      state,
      quote_id: state.dual.selected_quote_id,
    });
    if (!result.ok) {
      publish(result.state);
      setConfirmNote(humanizeDualOfferBlockReason(result.reason, locale));
      return;
    }
    publish(result.state);
    const liveGate = evaluateDualOfferLivePaymentGate({ state: result.state });
    // Final purchase stays fail-closed in this build — human copy only.
    setConfirmNote(
      liveGate.allow
        ? dualOfferMsg(locale, "dualOfferConfirmSuccess")
        : humanizeDualOfferBlockReason(liveGate.reason, locale),
    );
  }, [state, selectedQuote, publish, locale]);

  const finalDisabled =
    loading ||
    error ||
    !state?.dual.selected_quote_id ||
    Boolean(selectedQuote?.unavailable_reason);

  const selectedTitle =
    state?.dual.selected_offer === "direct_box"
      ? dualOfferMsg(locale, "dualOfferDirectTitle")
      : state?.dual.selected_offer === "shared_pallet"
        ? dualOfferMsg(locale, "dualOfferSharedTitle")
        : null;

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
      <div
        className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5"
        data-testid="dual-offer-customer-panel"
      >
        <header className="space-y-1.5">
          <h2
            id="dual-offer-heading"
            className="text-lg font-semibold text-foreground tracking-tight"
          >
            {dualOfferMsg(locale, "dualOfferTitle")}
          </h2>
          <p className="text-sm text-foreground/80">
            {dualOfferMsg(locale, "dualOfferSubtitle")}
          </p>
        </header>

        {loading ? (
          <div
            className="space-y-3"
            data-testid="dual-offer-loading"
            aria-busy="true"
            aria-label={dualOfferMsg(locale, "dualOfferLoading")}
          >
            <OfferRowSkeleton />
            <OfferRowSkeleton />
          </div>
        ) : null}

        {error ? (
          <div className="space-y-2" data-testid="dual-offer-error">
            <p className="text-sm text-destructive">
              {dualOfferMsg(locale, "dualOfferError")}
            </p>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              data-testid="dual-offer-retry"
              onClick={() => setReloadToken((n) => n + 1)}
            >
              {dualOfferMsg(locale, "dualOfferRetry")}
            </button>
          </div>
        ) : null}

        {state && !loading && !error ? (
          <>
            <div
              className="grid gap-3"
              role="radiogroup"
              aria-label={dualOfferMsg(locale, "dualOfferTitle")}
            >
              <OfferRow
                title={dualOfferMsg(locale, "dualOfferSharedTitle")}
                quote={state.dual.shared_pallet}
                selected={state.dual.selected_offer === "shared_pallet"}
                onSelect={() => onSelect("shared_pallet")}
                locale={locale}
                detailsOpen={detailsOpen.shared_pallet}
                onToggleDetails={() =>
                  setDetailsOpen((d) => ({
                    ...d,
                    shared_pallet: !d.shared_pallet,
                  }))
                }
              />
              <OfferRow
                title={dualOfferMsg(locale, "dualOfferDirectTitle")}
                quote={state.dual.direct_box}
                selected={state.dual.selected_offer === "direct_box"}
                onSelect={() => onSelect("direct_box")}
                locale={locale}
                detailsOpen={detailsOpen.direct_box}
                onToggleDetails={() =>
                  setDetailsOpen((d) => ({
                    ...d,
                    direct_box: !d.direct_box,
                  }))
                }
              />
            </div>

            {selectedQuote ? (
              <p
                className="text-sm text-foreground/80"
                data-testid="dual-offer-delivery-summary"
              >
                {dualOfferMsg(locale, "dualOfferSelectedDeliverySummary", {
                  offer: selectedTitle ?? "",
                  delivery: deliveryLabel(selectedQuote, locale),
                  debit: debitLabel(selectedQuote, locale),
                })}
              </p>
            ) : null}

            <p
              className="text-sm text-foreground/80"
              data-testid="dual-offer-confirm-hint"
            >
              {selectedOfferConfirmHint(selectedQuote, locale)}
            </p>

            <button
              type="button"
              data-testid="dual-offer-final"
              className="w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-semibold disabled:opacity-40"
              disabled={finalDisabled}
              onClick={onFinalConfirm}
            >
              {selectedTitle
                ? dualOfferMsg(locale, "dualOfferFinalCtaWithOffer", {
                    offer: selectedTitle,
                  })
                : dualOfferMsg(locale, "dualOfferFinalCta")}
            </button>

            {confirmNote ? (
              <p
                className="text-sm text-foreground"
                data-testid="dual-offer-final-reason"
              >
                {confirmNote}
              </p>
            ) : null}
          </>
        ) : null}

        {loading ? (
          <button
            type="button"
            data-testid="dual-offer-final"
            className="w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-semibold opacity-40"
            disabled
          >
            {dualOfferMsg(locale, "dualOfferFinalCta")}
          </button>
        ) : null}
      </div>

      {showDiagnostics ? (
        <aside
          className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-3 py-3 space-y-1.5 font-mono text-[11px] text-muted-foreground"
          data-testid="dual-offer-review-diagnostics"
        >
          <p className="font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dualOfferMsg(locale, "dualOfferDiagnosticsTitle")}
          </p>
          <p>{dualOfferMsg(locale, "dualOfferPersistenceNote")}</p>
          {!OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE ? (
            <p>OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE=false</p>
          ) : null}
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
        </aside>
      ) : null}
    </section>
  );
}

/** @deprecated Prefer DualOfferCheckoutPanel — kept for /dev page import stability. */
export { DualOfferCheckoutPanel as DualOfferComparePreview };
