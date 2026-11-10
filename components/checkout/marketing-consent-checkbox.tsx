"use client";

import { useState } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";
import { isMarketingConsentCheckoutEnabled } from "@/lib/marketing/checkout-consent-flag";
import { NEW_PALLET_OPEN_CONSENT_TEXT_VERSION } from "@/lib/marketing/new-pallet-open-consent";

/**
 * Unchecked-by-default marketing opt-in on the confirmation page.
 * Saves on change (no separate coloured CTA).
 * Gated by MARKETING_CONSENT_CHECKOUT_ENABLED (default OFF).
 */
export function MarketingConsentCheckbox(props: {
  email: string | null | undefined;
}) {
  const shopping = useShoppingContextOptional();
  const t = shopping?.t ?? ((k: string) => k);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isMarketingConsentCheckoutEnabled()) {
    return null;
  }

  const privacyMarker = "<<<PRIVACY>>>";
  const template = t("checkout.marketingConsentNewPallet", {
    privacy: privacyMarker,
  });
  const [before, after] = template.split(privacyMarker);

  const onToggle = async (next: boolean) => {
    setChecked(next);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optedIn: next,
          email: props.email ?? undefined,
        }),
      });
      if (!res.ok) {
        setChecked(!next);
        setError("save_failed");
      }
    } catch {
      setChecked(!next);
      setError("save_failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
      data-testid="marketing-consent-new-pallet"
      data-text-version={NEW_PALLET_OPEN_CONSENT_TEXT_VERSION}
    >
      <Checkbox
        id="marketing-consent-new-pallet"
        checked={checked}
        disabled={saving}
        onCheckedChange={(v) => void onToggle(v === true)}
        className="mt-0.5"
      />
      <label
        htmlFor="marketing-consent-new-pallet"
        className="text-sm leading-snug text-gray-800"
      >
        {before}
        <Link
          href="/integritetspolicy"
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("checkout.marketingConsentPrivacyLink")}
        </Link>
        {after}
      </label>
      {error ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
