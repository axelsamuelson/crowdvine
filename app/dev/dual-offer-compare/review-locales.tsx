"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DualOfferCheckoutPanel } from "@/components/checkout/dual-offer-checkout-panel";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";
import type { DualOfferQuoteSet } from "@/lib/checkout/offer-quote";

/**
 * Review locale must drive ShoppingContext too — otherwise the site header
 * (MENU / HOME…) stays on the resolved cookie/Accept-Language locale while
 * only the dual-offer panel switches. Real /checkout uses shopping.locale for
 * both; this sync makes the review route match that.
 */
export function DualOfferReviewLocales(props: { dual: DualOfferQuoteSet }) {
  const search = useSearchParams();
  const shopping = useShoppingContext();
  const initial = useMemo(() => {
    const q = String(search.get("locale") ?? "sv")
      .trim()
      .toLowerCase();
    return q === "en" ? "en" : "sv";
  }, [search]);
  const [locale, setLocaleState] = useState<"sv" | "en">(initial);

  useEffect(() => {
    if (shopping.context.locale === locale) return;
    void shopping.setLocale(locale);
  }, [locale, shopping.context.locale, shopping.setLocale]);

  return (
    <div
      className="space-y-4 scroll-mt-top-spacing"
      data-testid="dual-offer-review-root"
    >
      <div
        className="flex gap-2 scroll-mt-top-spacing"
        role="group"
        aria-label="Locale"
        data-testid="dual-offer-locale-row"
      >
        <button
          type="button"
          data-testid="dual-offer-locale-sv"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "sv" ? "border-foreground" : "border-border"
          }`}
          onClick={() => setLocaleState("sv")}
        >
          Svenska
        </button>
        <button
          type="button"
          data-testid="dual-offer-locale-en"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "en" ? "border-foreground" : "border-border"
          }`}
          onClick={() => setLocaleState("en")}
        >
          English
        </button>
      </div>
      <DualOfferCheckoutPanel
        key={locale}
        initialDual={props.dual}
        locale={locale}
        showDirectOffer
        className="scroll-mt-top-spacing"
      />
    </div>
  );
}
