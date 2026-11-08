"use client";

/**
 * Preview-only dual-offer compare UI. Not mounted in live checkout.
 * Requires parent page to gate on CHECKOUT_DUAL_OFFER_COMPARE + preview env.
 * Uses existing Geist / simple layout primitives — no new design system.
 */

import { useCallback, useState } from "react";
import type { DualOfferQuoteSet, OfferQuote } from "@/lib/checkout/offer-quote";
import {
  acceptSelectedOfferQuote,
  createOfferCheckoutSessionState,
  mayEnableFinalCheckoutAction,
  switchSelectedOffer,
  type OfferCheckoutSessionState,
} from "@/lib/checkout/offer-acceptance";

function OfferCard(props: {
  title: string;
  quote: OfferQuote | null;
  selected: boolean;
  onSelect: () => void;
  locale: "sv" | "en";
}) {
  const { quote, locale } = props;
  if (!quote) {
    return (
      <div className="rounded-lg border border-border p-4 opacity-60">
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
      disabled={unavailable}
      onClick={props.onSelect}
      className={`w-full text-left rounded-lg border p-4 transition ${
        props.selected
          ? "border-foreground ring-1 ring-foreground"
          : "border-border"
      } ${unavailable ? "opacity-50 cursor-not-allowed" : "hover:border-foreground/40"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{props.title}</h3>
        {quote.pricing_source === "synthetic_fixture" ? (
          <span className="text-[10px] uppercase tracking-wide text-amber-700">
            Synthetic preview
          </span>
        ) : null}
      </div>
      {unavailable ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {quote.unavailable_reason}
        </p>
      ) : (
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Bottle</dt>
            <dd>{quote.bottle_unit_price_sek.toFixed(2)} SEK</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Wines</dt>
            <dd>{quote.wines_subtotal_sek.toFixed(2)} SEK</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd>{quote.shipping_sek.toFixed(2)} SEK</dd>
          </div>
          <div className="flex justify-between gap-4 text-base font-semibold pt-1 border-t border-border">
            <dt>Total</dt>
            <dd>{quote.total_sek.toFixed(2)} SEK</dd>
          </div>
          <p className="pt-2 text-muted-foreground">{terms}</p>
          <p className="text-muted-foreground">{debit}</p>
          <p className="text-xs text-muted-foreground">
            Contract policy: undecided (not payment consent)
          </p>
        </dl>
      )}
    </button>
  );
}

export function DualOfferComparePreview(props: {
  initialDual: DualOfferQuoteSet;
  locale?: "sv" | "en";
}) {
  const locale = props.locale ?? "sv";
  const [state, setState] = useState<OfferCheckoutSessionState>(() =>
    createOfferCheckoutSessionState(props.initialDual),
  );
  const [disclosure, setDisclosure] = useState<string | null>(null);

  const onSelect = useCallback(
    (offer: "shared_pallet" | "direct_box") => {
      const result = switchSelectedOffer({ state, toOffer: offer });
      setState(result.state);
      if (result.disclosure.ok) {
        setDisclosure(
          `Bottle ${result.disclosure.bottle_unit_price_from ?? "—"} → ${result.disclosure.bottle_unit_price_to} SEK · Total ${result.disclosure.total_from_sek ?? "—"} → ${result.disclosure.total_to_sek} SEK`,
        );
      } else {
        setDisclosure(result.disclosure.reason);
      }
    },
    [state],
  );

  const onAccept = useCallback(() => {
    const qid = state.dual.selected_quote_id;
    if (!qid) return;
    const result = acceptSelectedOfferQuote({ state, quote_id: qid });
    if (result.ok) {
      setState(result.state);
      setDisclosure("Quote accepted (not payment). Final action may enable.");
    } else {
      setDisclosure(result.reason);
      setState(result.state);
    }
  }, [state]);

  const finalGate = mayEnableFinalCheckoutAction(state);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 font-sans">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-amber-700">
          Preview only · dual-offer compare · flag gated
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Two offers, same checkout
        </h1>
        <p className="text-sm text-muted-foreground">
          Choosing an offer updates the whole quote. It is not payment consent.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <OfferCard
          title="Shared pallet"
          quote={state.dual.shared_pallet}
          selected={state.dual.selected_offer === "shared_pallet"}
          onSelect={() => onSelect("shared_pallet")}
          locale={locale}
        />
        <OfferCard
          title="Direct"
          quote={state.dual.direct_box}
          selected={state.dual.selected_offer === "direct_box"}
          onSelect={() => onSelect("direct_box")}
          locale={locale}
        />
      </div>

      {disclosure ? (
        <p className="text-sm rounded-md border border-border bg-muted/40 p-3">
          {disclosure}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold disabled:opacity-40"
          disabled={
            !state.dual.selected_quote_id ||
            Boolean(state.acceptance?.quote_id === state.dual.selected_quote_id)
          }
          onClick={onAccept}
        >
          Accept selected quote
        </button>
        <button
          type="button"
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
          disabled={!finalGate.allow}
          title={finalGate.reason ?? undefined}
        >
          Final action (disabled without acceptance)
        </button>
      </div>
      {!finalGate.allow ? (
        <p className="text-xs text-muted-foreground">
          Final blocked: {finalGate.reason}
        </p>
      ) : null}
    </div>
  );
}
