"use client";

import { useEffect, useState } from "react";

import { fallbackSekToDisplayRate } from "@/lib/shopping-context/currency-policy";
import { countryPolicy } from "@/lib/market/country-registry";
import { effectiveShipToCountry } from "@/lib/market/ship-to-client";

export function ApproxShipToPrice({ sek }: { sek: number }) {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    setCountry(effectiveShipToCountry());
  }, []);

  if (!country || country === "SE" || !Number.isFinite(sek)) return null;
  const currency = countryPolicy(country).displayCurrency;
  if (currency === "SEK") return null;
  const rate = fallbackSekToDisplayRate(currency);
  if (!rate || rate <= 0) return null;
  const amount = Math.round(sek / rate);
  return (
    <span className="text-muted-foreground" suppressHydrationWarning>
      {" "}
      ≈ {amount} {currency}
    </span>
  );
}
