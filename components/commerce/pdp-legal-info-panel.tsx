import Link from "next/link";
import { Building2, IdCard, Truck, Undo2, type LucideIcon } from "lucide-react";

import { termsPath } from "@/lib/commerce/terms-section-href";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** Sketch tokens: ≥4.5:1 (#4f4f4f on #ebe8e3 ≈ 6.7:1). */
const LEGAL_SURFACE = "#ebe8e3";
const LEGAL_FG = "#4f4f4f";

type LegalRow = {
  icon: LucideIcon;
  text: string;
  testId: string;
};

/**
 * PACT wine PDP: recessed legal / shipping list under the × 6 lika/blandat
 * picker. Always visible (not a modal or collapsible). Copy for the first
 * three rows plus age line is locked via `commerce.*` message keys.
 */
export function PdpLegalInfoPanel({
  locale = "sv",
  className,
}: {
  locale?: AppLocale;
  className?: string;
}) {
  const rows: LegalRow[] = [
    {
      icon: Truck,
      text: translate(locale, "commerce.sharedPalletDelivery"),
      testId: "pdp-legal-shared-pallet",
    },
    {
      icon: Undo2,
      text: translate(locale, "commerce.withdrawalLine"),
      testId: "pdp-legal-withdrawal",
    },
    {
      icon: Building2,
      text: translate(locale, "commerce.sellerLine"),
      testId: "pdp-legal-seller",
    },
    {
      icon: IdCard,
      text: translate(locale, "commerce.ageMinimumLine"),
      testId: "pdp-legal-age",
    },
  ];

  const termsHref = termsPath(locale);
  const termsLabel = translate(locale, "commerce.termsLinkArrow");

  return (
    <aside
      className={cn("w-full min-w-0 rounded-lg px-4 pb-4 pt-3.5", className)}
      style={{ backgroundColor: LEGAL_SURFACE, color: LEGAL_FG }}
      data-pdp-legal-info-panel
      aria-label={locale === "en" ? "Purchase information" : "Köpinformation"}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map(({ icon: Icon, text, testId }) => (
          <li
            key={testId}
            className="flex items-start gap-2 text-sm font-normal leading-[1.45] no-underline"
            style={{ color: LEGAL_FG }}
            data-testid={testId}
          >
            <Icon
              className="mt-0.5 size-4 shrink-0"
              strokeWidth={1.7}
              aria-hidden
            />
            <span className="text-pretty no-underline">{text}</span>
          </li>
        ))}
      </ul>
      <Link
        href={termsHref}
        className="ml-[26px] mt-3 inline-flex items-center gap-1.5 text-sm font-medium leading-[1.45] no-underline hover:text-foreground"
        style={{ color: LEGAL_FG }}
        data-testid="pdp-legal-terms-link"
      >
        {termsLabel}
      </Link>
    </aside>
  );
}
