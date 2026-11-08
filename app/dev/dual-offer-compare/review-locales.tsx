"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DualOfferCheckoutPanel } from "@/components/checkout/dual-offer-checkout-panel";
import type { DualOfferQuoteSet } from "@/lib/checkout/offer-quote";

export function DualOfferReviewLocales(props: { dual: DualOfferQuoteSet }) {
  const search = useSearchParams();
  const initial = useMemo(() => {
    const q = String(search.get("locale") ?? "sv")
      .trim()
      .toLowerCase();
    return q === "en" ? "en" : "sv";
  }, [search]);
  const [locale, setLocale] = useState<"sv" | "en">(initial);
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Locale">
        <button
          type="button"
          data-testid="dual-offer-locale-sv"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "sv" ? "border-foreground" : "border-border"
          }`}
          onClick={() => setLocale("sv")}
        >
          Svenska
        </button>
        <button
          type="button"
          data-testid="dual-offer-locale-en"
          className={`rounded-md border px-3 py-1.5 text-sm ${
            locale === "en" ? "border-foreground" : "border-border"
          }`}
          onClick={() => setLocale("en")}
        >
          English
        </button>
      </div>
      <DualOfferCheckoutPanel
        key={locale}
        initialDual={props.dual}
        locale={locale}
      />
    </div>
  );
}
