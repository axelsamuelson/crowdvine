"use client";

import { WineEnrichmentCollapsible } from "@/components/product/wine-enrichment-collapsible";
import { useTranslations } from "@/lib/hooks/use-translations";

interface WineFoodPairingProps {
  items: string[];
}

export function WineFoodPairing({ items }: WineFoodPairingProps) {
  const { t } = useTranslations();
  const pairing = items.map((i) => i.trim()).filter(Boolean);
  if (pairing.length === 0) return null;

  return (
    <WineEnrichmentCollapsible title={t("product.pdp.foodPairing")}>
      <ul className="flex flex-wrap gap-2">
        {pairing.map((item) => (
          <li
            key={item}
            className="rounded-full border border-border px-3.5 py-1.5 text-sm text-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </WineEnrichmentCollapsible>
  );
}
