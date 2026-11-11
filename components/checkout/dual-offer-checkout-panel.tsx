"use client";

/**
 * Customer-facing dual-offer / shared-pallet checkout panel.
 * Selecting an offer drives the quote; the final CTA carries explicit
 * acceptance of the selected quote_id (fail-closed on mismatch/expiry).
 * Legal CTA copy states payment obligation (C-249/21).
 * Direct row is shown only when DIRECT_BOX_CHECKOUT_ENABLED (showDirectOffer).
 *
 * Shared-only (direct hidden): one plain block — heading, close+delivery,
 * charge timing — no selectable card / duplicate totals. Purchase CTA is
 * rendered via DualOfferPurchaseActions (sticky under Totalt / mobile bottom).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { mayStartSharedPalletCardSave } from "@/lib/checkout/dual-offer-checkout-isolation";
import {
  evaluateDualOfferLivePaymentGate,
  OFFER_SNAPSHOT_PERSISTENCE_AVAILABLE,
} from "@/lib/checkout/dual-offer-payment-boundary";
import {
  formatOfferSek,
  formatOfferTotalAmountLabel,
} from "@/lib/checkout/dual-offer-display";
import {
  dualOfferMsg,
  humanizeDualOfferBlockReason,
  offerBottleAverageLabelKey,
  offerTotalsIncludeVat,
  type DualOfferUiLocale,
} from "@/lib/checkout/dual-offer-customer-copy";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";
import {
  directBoxDeliveryCopy,
  formatCheckoutPalletDeliveryLines,
} from "@/lib/checkout/shared-pallet-close-delivery-copy";
import { CheckoutPalletFillStatus } from "@/components/checkout/checkout-pallet-fill-status";
import type { CheckoutPalletFillInput } from "@/lib/checkout/pallet-fill-display";

export { formatOfferSek } from "@/lib/checkout/dual-offer-display";

type Locale = DualOfferUiLocale;

function deliveryLabel(quote: OfferQuote, locale: Locale): string {
  // Direct: home delivery only — no ETA (carrier contract unsigned).
  if (quote.offer === "direct_box") {
    return directBoxDeliveryCopy(locale);
  }
  return locale === "sv"
    ? quote.delivery_terms.previewLabelSv
    : quote.delivery_terms.previewLabelEn;
}

function debitLabel(quote: OfferQuote, locale: Locale): string {
  return locale === "sv"
    ? quote.debit_timing.previewLabelSv
    : quote.debit_timing.previewLabelEn;
}

function sharedCheckoutDeliveryLines(
  quote: OfferQuote,
  locale: Locale,
  deadlineLabel: string | null,
): { closeLine: string; deliveryLine: string } | null {
  if (quote.offer !== "shared_pallet") {
    return {
      closeLine: deliveryLabel(quote, locale),
      deliveryLine: "",
    };
  }
  // Checkout: two short lines (full owner constant stays on confirmation/email).
  return formatCheckoutPalletDeliveryLines(locale, deadlineLabel);
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
        <div className="h-3 w-48 max-w-full rounded bg-muted-foreground/15" />
        <div className="h-3 w-40 max-w-full rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

function offerDeliveryFact(
  quote: OfferQuote,
  locale: Locale,
): string {
  if (quote.offer === "direct_box") {
    return dualOfferMsg(locale, "dualOfferDirectDeliveryFact");
  }
  return dualOfferMsg(locale, "dualOfferSharedDeliveryFact");
}

function offerExplanationBody(
  quote: OfferQuote,
  locale: Locale,
  deadlineLabel: string | null,
): string {
  if (quote.offer === "direct_box") {
    return dualOfferMsg(locale, "directBoxBody");
  }
  if (deadlineLabel) {
    return dualOfferMsg(locale, "dualOfferSharedBody", {
      datum: deadlineLabel,
    });
  }
  return dualOfferMsg(locale, "dualOfferSharedBodyNoDate");
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
  selectable?: boolean;
  /** Compare mode still shows the compact price header; hide Snittpris/Viner/Frakt/Totalt breakdown. */
  showPriceBreakdown?: boolean;
  /** Localized shared-pallet charge deadline for explanation body. */
  deadlineLabel?: string | null;
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
  const showDetails =
    props.showPriceBreakdown !== false &&
    (props.selected || props.detailsOpen);
  const totalSuffix = offerTotalsIncludeVat()
    ? ` ${dualOfferMsg(locale, "dualOfferInclVat")}`
    : "";
  const selectable = props.selectable !== false;

  const factClass =
    "text-[14px] leading-snug text-[#525252]";
  const explainClass =
    "text-[14px] leading-relaxed text-[#525252]";

  const body = (
    <>
      {/* Row 1 — title + total */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {selectable ? (
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
          ) : null}
          <h3 className="min-w-0 font-semibold text-base leading-tight">
            {props.title}
          </h3>
        </div>
        {!unavailable ? (
          <div className="shrink-0 text-right">
            <p
              className="whitespace-nowrap text-lg font-semibold tabular-nums leading-none"
              data-testid={`dual-offer-total-${quote.offer}`}
            >
              {formatOfferSek(quote.total_sek, locale)}
            </p>
            <p
              className="mt-1 text-[14px] leading-none text-[#525252]"
              data-testid={`dual-offer-incl-shipping-${quote.offer}`}
            >
              {dualOfferMsg(locale, "dualOfferInclShipping")}
            </p>
          </div>
        ) : null}
      </div>

      {unavailable ? (
        <p className={`mt-2 ${factClass} ${selectable ? "pl-7" : ""}`}>
          {quote.unavailable_reason}
        </p>
      ) : (
        <div className={selectable ? "pl-7" : ""}>
          {/* Row 2 — key facts (delivery + charge). Snittpris only when
              the selected/open breakdown is not already showing it. */}
          <div className={`mt-2 space-y-1 ${factClass}`}>
            <p data-testid={`dual-offer-delivery-${quote.offer}`}>
              {offerDeliveryFact(quote, locale)}
            </p>
            <p data-testid={`dual-offer-debit-${quote.offer}`}>
              {debitLabel(quote, locale)}
            </p>
            {quote.bottle_count > 0 && !showDetails ? (
              <p
                className="tabular-nums"
                data-testid={`dual-offer-bottle-price-${quote.offer}`}
              >
                {bottleLabel}:{" "}
                {formatOfferSek(
                  quote.subtotal_sek / quote.bottle_count,
                  locale,
                )}
              </p>
            ) : null}
          </div>
          {/* Row 3 — explanation (same size/colour both cards) */}
          <div className={`mt-2 space-y-1 ${explainClass}`}>
            <p
              data-testid={
                quote.offer === "direct_box"
                  ? "dual-offer-direct-body"
                  : "dual-offer-shared-body"
              }
            >
              {offerExplanationBody(
                quote,
                locale,
                props.deadlineLabel ?? null,
              )}
            </p>
            <p data-testid={`dual-offer-age-${quote.offer}`}>
              {dualOfferMsg(locale, "dualOfferAgeCheckLine")}
            </p>
          </div>
        </div>
      )}
    </>
  );

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
      {selectable ? (
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
          {body}
        </button>
      ) : (
        <div className="p-3">{body}</div>
      )}

      {!unavailable && props.showPriceBreakdown !== false ? (
        <div className={`px-3 pb-3 ${selectable ? "pl-10" : ""}`}>
          {selectable && !props.selected ? (
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

export type DualOfferPurchaseActionsVariant = "continue" | "bind";

export type DualOfferPurchaseActionsModel = {
  locale: Locale;
  /**
   * `continue` = non-binding step (no Totalt / legal / terms).
   * `bind` = order-placing button with payment obligation (after Payment Element).
   */
  variant: DualOfferPurchaseActionsVariant;
  finalCtaLabel: string;
  /** Totalt X inkl. moms och frakt — above the binding line (`bind` only). */
  totalInclLine: string | null;
  legalLine: string | null;
  disabled: boolean;
  /** Show spinner / confirming label on the button. */
  loading?: boolean;
  confirmNote: string | null;
  /** Inline Stripe / validation error under the button (`bind` only). */
  errorNote?: string | null;
  onConfirm: () => void;
  testId?: string;
};

/** Continue-to-card or binding purchase CTA (+ legal block when variant=bind). */
export function DualOfferPurchaseActions(props: {
  model: DualOfferPurchaseActionsModel;
  className?: string;
}) {
  const { model, className } = props;
  const { locale } = model;
  const isBind = model.variant === "bind";
  const rootTestId =
    model.testId ??
    (isBind ? "dual-offer-bind-actions" : "dual-offer-continue-actions");

  return (
    <div
      className={`space-y-3 font-sans ${className ?? ""}`}
      data-testid={rootTestId}
      data-variant={model.variant}
    >
      {isBind && model.totalInclLine ? (
        <p
          className="text-sm font-medium text-foreground"
          data-testid="dual-offer-total-incl"
        >
          {model.totalInclLine}
        </p>
      ) : null}
      {isBind && model.legalLine ? (
        <p
          className="text-sm text-foreground"
          data-testid="dual-offer-legal-line"
        >
          {model.legalLine}
        </p>
      ) : null}

      <button
        type="button"
        data-testid={isBind ? "dual-offer-final" : "dual-offer-continue"}
        className="w-full rounded-xl bg-foreground text-background px-4 py-3 text-sm font-semibold disabled:opacity-40"
        disabled={model.disabled || model.loading === true}
        aria-busy={model.loading === true}
        onClick={model.onConfirm}
      >
        {model.loading
          ? dualOfferMsg(locale, "dualOfferCardConfirming")
          : model.finalCtaLabel}
      </button>

      {/* Helper (card incomplete) first, then terms under the bind button. */}
      {model.confirmNote ? (
        <p
          className="text-sm text-foreground"
          data-testid="dual-offer-final-reason"
        >
          {model.confirmNote}
        </p>
      ) : null}

      {isBind && model.errorNote ? (
        <p
          className="text-sm text-destructive"
          data-testid="dual-offer-bind-error"
          role="alert"
        >
          {model.errorNote}
        </p>
      ) : null}

      {isBind ? (
        <p
          className="text-xs text-foreground/70"
          data-testid="dual-offer-terms-line"
        >
          {(() => {
            const marker = "<<<TERMS>>>";
            const template = dualOfferMsg(locale, "dualOfferTermsLine", {
              terms: marker,
            });
            const [before, after] = template.split(marker);
            return (
              <>
                {before}
                <Link
                  href="/villkor"
                  className="underline underline-offset-2 text-foreground"
                >
                  {dualOfferMsg(locale, "dualOfferTermsLink")}
                </Link>
                {after}
              </>
            );
          })()}
        </p>
      ) : null}
    </div>
  );
}

/** Shared-pallet binding legal copy + Totalt line for the final Köp button. */
export function buildSharedPalletBindCopy(args: {
  locale: Locale;
  totalSek: number;
  chargeDeadlineAt: string | null | undefined;
  showDirectOffer: boolean;
}): {
  totalLabel: string;
  totalInclLine: string;
  legalLine: string;
  finalCtaLabel: string;
} {
  const totalLabel = formatOfferTotalAmountLabel(args.totalSek, args.locale);
  const deadlineLabel = formatSharedPalletChargeDeadline(
    args.chargeDeadlineAt,
    args.locale,
  );
  const withSwitch = args.showDirectOffer;
  const legalLine = deadlineLabel
    ? dualOfferMsg(
        args.locale,
        withSwitch
          ? "dualOfferLegalLineSharedWithSwitch"
          : "dualOfferLegalLineShared",
        { total: totalLabel, datum: deadlineLabel },
      )
    : dualOfferMsg(
        args.locale,
        withSwitch
          ? "dualOfferLegalLineSharedWithSwitchNoDate"
          : "dualOfferLegalLineSharedNoDate",
        { total: totalLabel },
      );
  return {
    totalLabel,
    totalInclLine: dualOfferMsg(args.locale, "dualOfferTotalIncl", {
      total: totalLabel,
    }),
    legalLine,
    finalCtaLabel: dualOfferMsg(args.locale, "dualOfferFinalCtaShared", {
      total: totalLabel,
    }),
  };
}

export type DualOfferCheckoutPanelProps = {
  locale?: Locale;
  initialDual?: DualOfferQuoteSet | null;
  fetchArgs?: {
    palletId: string;
    countryCode?: string | null;
    allowSyntheticDirect?: boolean;
  } | null;
  openIntentIds?: string[];
  onStateChange?: (state: OfferCheckoutSessionState) => void;
  /** When false (DIRECT_BOX_CHECKOUT_ENABLED off), hide the direct row. */
  showDirectOffer?: boolean;
  /**
   * Pallet-close switch-to-direct: always mint a fresh session (no acceptance
   * reconcile) and prefer the direct offer when shown.
   */
  forceFreshSession?: boolean;
  preferOffer?: "shared_pallet" | "direct_box" | null;
  showDiagnostics?: boolean;
  className?: string;
  /**
   * When false, purchase CTA is not rendered inline — parent mounts
   * DualOfferPurchaseActions from onPurchaseActionsChange (checkout layout).
   * Dev/compare pages keep inlinePurchase true.
   */
  inlinePurchase?: boolean;
  /** Address/postal complete — gates the purchase button. */
  purchaseEnabled?: boolean;
  /**
   * B2C 6-bottle cart minimum. When false, Fortsätt is disabled and
   * card-step unlock is refused. Pair with `cartBlockedNote` (existing
   * checkout.orderBlocked copy — no new marketing strings).
   */
  cartMinimumMet?: boolean;
  /** Existing blocked-order helper; shown under Fortsätt when minimum unmet. */
  cartBlockedNote?: string | null;
  onPurchaseActionsChange?: (
    model: DualOfferPurchaseActionsModel | null,
  ) => void;
  /**
   * Discreet pallet fill status (CRO). Default on; pass false to hide.
   * When fill data is missing/stale, the child component returns null.
   */
  showPalletFillStatus?: boolean;
  palletFill?: CheckoutPalletFillInput | null;
  /**
   * Shared-pallet buy: after quote acceptance, parent unlocks SetupIntent /
   * Payment Element / confirm→reservation on the same checkout page.
   */
  onSharedPalletCardStepRequest?: () => void;
  /** True once parent has unlocked the card-save step. */
  sharedPalletCardStepUnlocked?: boolean;
};

export function DualOfferCheckoutPanel(props: DualOfferCheckoutPanelProps) {
  const locale = props.locale ?? "sv";
  // Review-only: never render diagnostics in production (even if a caller passes true).
  const showDiagnostics =
    props.showDiagnostics === true &&
    !(
      process.env.NODE_ENV === "production" &&
      String(process.env.VERCEL_ENV ?? "").trim() !== "preview"
    );
  const showDirectOffer = props.showDirectOffer === true;
  const forceFreshSession = props.forceFreshSession === true;
  const preferOffer = props.preferOffer ?? null;
  const inlinePurchase = props.inlinePurchase !== false;
  const purchaseEnabled = props.purchaseEnabled !== false;
  const cartMinimumMet = props.cartMinimumMet !== false;
  const cartBlockedNote = props.cartBlockedNote ?? null;
  const showPalletFillStatus = props.showPalletFillStatus !== false;
  const palletFill = props.palletFill ?? null;
  const requestGen = useRef(0);
  const hasHydratedQuoteRef = useRef(Boolean(props.initialDual));
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
  }>({
    shared_pallet: preferOffer !== "direct_box",
    direct_box: preferOffer === "direct_box",
  });

  const publish = useCallback(
    (next: OfferCheckoutSessionState) => {
      setState(next);
      props.onStateChange?.(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onStateChange via props
    [props.onStateChange],
  );

  const onStateChange = props.onStateChange;
  const fetchPalletId = props.fetchArgs?.palletId;
  const fetchCountry = props.fetchArgs?.countryCode;
  const fetchSynthetic = props.fetchArgs?.allowSyntheticDirect;
  const initialDual = props.initialDual;

  // Keep openIntentIds in a ref so preference reconcile does not recreate the
  // fetch effect (that used to flash Leverans: Delad pall skeleton).
  const openIntentIdsRef = useRef(props.openIntentIds);
  openIntentIdsRef.current = props.openIntentIds;

  const ensurePreferredSelected = useCallback(
    (next: OfferCheckoutSessionState): OfferCheckoutSessionState => {
      const openIntentIds = openIntentIdsRef.current;
      if (
        preferOffer === "direct_box" &&
        showDirectOffer &&
        next.dual.direct_box &&
        !next.dual.direct_box.unavailable_reason
      ) {
        if (next.dual.selected_offer === "direct_box" && !next.acceptance) {
          return next;
        }
        return switchSelectedOffer({
          state: next,
          toOffer: "direct_box",
          openIntentIds,
        }).state;
      }
      if (showDirectOffer) return next;
      if (!next.dual.shared_pallet || next.dual.shared_pallet.unavailable_reason) {
        return next;
      }
      if (next.dual.selected_offer === "shared_pallet") return next;
      return switchSelectedOffer({
        state: next,
        toOffer: "shared_pallet",
        openIntentIds,
      }).state;
    },
    [showDirectOffer, preferOffer],
  );

  useEffect(() => {
    if (!fetchPalletId) {
      if (initialDual) {
        let next = createOfferCheckoutSessionState(initialDual);
        next = ensurePreferredSelected(next);
        setState(next);
        onStateChange?.(next);
        setLoading(false);
        setError(false);
      }
      return;
    }
    const gen = ++requestGen.current;
    // Silent refresh when we already have a quote — avoid Delad pall skeleton flash.
    // Retry button clears hasHydratedQuoteRef before bumping reloadToken.
    if (!hasHydratedQuoteRef.current) {
      setLoading(true);
    }
    setError(false);
    const body = {
      pallet_id: fetchPalletId,
      country_code: fetchCountry ?? undefined,
      allow_synthetic_direct: false,
    };
    void fetch("/api/checkout/offer-quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (gen !== requestGen.current) return;
        if (!res.ok) throw new Error("fetch_failed");
        const j = (await res.json()) as { dual: DualOfferQuoteSet };
        if (gen !== requestGen.current) return;
        setState((prev) => {
          let next: OfferCheckoutSessionState;
          if (!prev || forceFreshSession) {
            next = createOfferCheckoutSessionState(j.dual);
          } else {
            next = reconcileAcceptanceAfterRecompute({
              state: prev,
              nextDual: j.dual,
            });
          }
          next = ensurePreferredSelected(next);
          onStateChange?.(next);
          return next;
        });
        hasHydratedQuoteRef.current = true;
        setLoading(false);
      })
      .catch(() => {
        if (gen !== requestGen.current) return;
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
    ensurePreferredSelected,
    forceFreshSession,
  ]);

  const onSelect = useCallback(
    (offer: "shared_pallet" | "direct_box") => {
      if (!state) return;
      if (offer === "direct_box" && !showDirectOffer) return;
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
    [state, props.openIntentIds, publish, showDirectOffer],
  );

  const selectedQuote: OfferQuote | null = state?.dual.selected_offer
    ? state.dual.selected_offer === "direct_box"
      ? state.dual.direct_box
      : state.dual.shared_pallet
    : null;

  const cardStepUnlocked = props.sharedPalletCardStepUnlocked === true;
  const onSharedPalletCardStepRequest = props.onSharedPalletCardStepRequest;

  /**
   * Non-binding step only. Binding Köp CTA lives after Payment Element (parent).
   * Never places reservation / confirms SetupIntent from this click.
   */
  const onContinueToCard = useCallback(() => {
    if (!state?.dual.selected_quote_id || !selectedQuote) return;
    if (cardStepUnlocked) return;
    if (!cartMinimumMet) {
      setConfirmNote(cartBlockedNote);
      return;
    }

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

    if (mayStartSharedPalletCardSave(selectedQuote)) {
      setConfirmNote(null);
      onSharedPalletCardStepRequest?.();
      return;
    }

    const liveGate = evaluateDualOfferLivePaymentGate({ state: result.state });
    setConfirmNote(
      liveGate.allow
        ? dualOfferMsg(locale, "dualOfferConfirmSuccess")
        : humanizeDualOfferBlockReason(liveGate.reason, locale),
    );
  }, [
    state,
    selectedQuote,
    publish,
    locale,
    cardStepUnlocked,
    onSharedPalletCardStepRequest,
    cartMinimumMet,
    cartBlockedNote,
  ]);

  const continueDisabled =
    !purchaseEnabled ||
    !cartMinimumMet ||
    loading ||
    error ||
    !state?.dual.selected_quote_id ||
    Boolean(selectedQuote?.unavailable_reason);

  // Sticky / early CTA: continue-only until card step unlocks, then null
  // (binding block mounts after Payment Element in checkout-client).
  const purchaseModel = useMemo<DualOfferPurchaseActionsModel | null>(() => {
    if (cardStepUnlocked) return null;
    if (loading) {
      return {
        locale,
        variant: "continue",
        finalCtaLabel: dualOfferMsg(locale, "dualOfferContinueToCard"),
        totalInclLine: null,
        legalLine: null,
        disabled: true,
        confirmNote: null,
        onConfirm: onContinueToCard,
      };
    }
    if (error || !state) return null;
    return {
      locale,
      variant: "continue",
      finalCtaLabel: dualOfferMsg(locale, "dualOfferContinueToCard"),
      totalInclLine: null,
      legalLine: null,
      disabled: continueDisabled,
      confirmNote: !cartMinimumMet ? cartBlockedNote : confirmNote,
      onConfirm: onContinueToCard,
    };
  }, [
    cardStepUnlocked,
    loading,
    error,
    state,
    locale,
    continueDisabled,
    confirmNote,
    onContinueToCard,
    cartMinimumMet,
    cartBlockedNote,
  ]);

  const onPurchaseActionsChange = props.onPurchaseActionsChange;
  const onPurchaseActionsChangeRef = useRef(onPurchaseActionsChange);
  onPurchaseActionsChangeRef.current = onPurchaseActionsChange;

  useEffect(() => {
    if (inlinePurchase) {
      onPurchaseActionsChangeRef.current?.(null);
      return;
    }
    onPurchaseActionsChangeRef.current?.(purchaseModel);
  }, [inlinePurchase, purchaseModel]);

  useEffect(() => {
    return () => {
      onPurchaseActionsChangeRef.current?.(null);
    };
  }, []);

  const quoteIds = [
    state?.dual.shared_pallet?.quote_id,
    showDirectOffer ? state?.dual.direct_box?.quote_id : null,
  ].filter(Boolean);

  const compareMode =
    showDirectOffer &&
    Boolean(state?.dual.direct_box || state?.dual.shared_pallet);

  const sharedQuote = state?.dual.shared_pallet ?? null;
  const sharedDeadline = sharedQuote
    ? formatSharedPalletChargeDeadline(
        sharedQuote.charge_deadline_at,
        locale,
      )
    : null;

  const purchaseSlot =
    inlinePurchase && purchaseModel ? (
      <DualOfferPurchaseActions model={purchaseModel} />
    ) : null;

  return (
    <section
      className={`space-y-4 font-sans ${props.className ?? ""}`}
      data-testid="dual-offer-checkout-panel"
      aria-labelledby="dual-offer-heading"
    >
      <div
        className={
          compareMode
            ? "space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5"
            : "space-y-3"
        }
        data-testid="dual-offer-customer-panel"
      >
        {compareMode ? (
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
        ) : (
          <h2
            id="dual-offer-heading"
            className="text-base font-semibold text-foreground tracking-tight"
          >
            {dualOfferMsg(locale, "dualOfferSharedOnlyTitle")}
          </h2>
        )}

        {loading && !state ? (
          <div
            className="space-y-3"
            data-testid="dual-offer-loading"
            aria-busy="true"
            aria-label={dualOfferMsg(locale, "dualOfferLoading")}
          >
            <OfferRowSkeleton />
            {showDirectOffer ? <OfferRowSkeleton /> : null}
          </div>
        ) : null}

        {error && !state ? (
          <div className="space-y-2" data-testid="dual-offer-error">
            <p className="text-sm text-destructive">
              {dualOfferMsg(locale, "dualOfferError")}
            </p>
            <button
              type="button"
              className="rounded-md border border-border px-3 py-1.5 text-sm"
              data-testid="dual-offer-retry"
              onClick={() => {
                hasHydratedQuoteRef.current = false;
                setReloadToken((n) => n + 1);
              }}
            >
              {dualOfferMsg(locale, "dualOfferRetry")}
            </button>
          </div>
        ) : null}

        {state && !error ? (
          compareMode ? (
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
                  selectable
                  deadlineLabel={sharedDeadline}
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
                  selectable
                  deadlineLabel={sharedDeadline}
                />
              </div>
              {purchaseSlot}
            </>
          ) : (
            <div
              className="space-y-2"
              data-testid="dual-offer-shared-only-block"
            >
              {showPalletFillStatus && palletFill ? (
                <CheckoutPalletFillStatus
                  locale={locale}
                  enabled={showPalletFillStatus}
                  palletId={palletFill.palletId}
                  reservedBottles={palletFill.reservedBottles}
                  capacity={palletFill.capacity}
                  cartBottles={palletFill.cartBottles}
                  fillAvailable={palletFill.fillAvailable}
                />
              ) : null}

              {sharedQuote && !sharedQuote.unavailable_reason ? (
                (() => {
                  const lines = sharedCheckoutDeliveryLines(
                    sharedQuote,
                    locale,
                    sharedDeadline,
                  );
                  return (
                    <div
                      className="space-y-1"
                      data-testid="dual-offer-delivery-shared_pallet"
                    >
                      <p className="text-sm text-foreground/85">
                        {lines?.closeLine}
                      </p>
                      {lines?.deliveryLine ? (
                        <p className="text-sm text-foreground/85">
                          {lines.deliveryLine}
                        </p>
                      ) : null}
                    </div>
                  );
                })()
              ) : sharedQuote?.unavailable_reason ? (
                <p className="text-sm text-muted-foreground">
                  {sharedQuote.unavailable_reason}
                </p>
              ) : (
                <p className="text-sm text-foreground/80">
                  {dualOfferMsg(locale, "dualOfferConfirmHintNone")}
                </p>
              )}

              {purchaseSlot}
            </div>
          )
        ) : null}

        {loading && inlinePurchase ? (
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
