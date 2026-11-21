import Link from "next/link";
import { Building2, IdCard, Truck, Undo2, type LucideIcon } from "lucide-react";

import { termsPath } from "@/lib/commerce/terms-section-href";
import { homeDeliveryGuidePath } from "@/lib/guides/home-delivery-guide";
import type { AppLocale } from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

/** Sketch tokens: ≥4.5:1 (#4f4f4f on #ebe8e3 ≈ 6.7:1). */
const LEGAL_SURFACE = "#ebe8e3";
const LEGAL_FG = "#4f4f4f";

/**
 * Icon column is size-4 (16px) + gap-2 (8px) = 24px — match link row to the
 * text column after the icon (not the icon’s left edge).
 */
const TEXT_COLUMN_PL = "pl-6";

/** Keep "2–3 veckor" / "2–3 weeks" on one line without altering locked characters. */
const NOWRAP_PHRASE = /(2–3 veckor|2–3 weeks)/;

function LegalRowText({ text }: { text: string }) {
  const parts = text.split(NOWRAP_PHRASE);
  return (
    <span className="text-pretty no-underline">
      {parts.map((part, i) =>
        part === "2–3 veckor" || part === "2–3 weeks" ? (
          <span key={i} className="whitespace-nowrap">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

type LegalRow = {
  icon: LucideIcon;
  text: string;
  testId: string;
};

const linkClass =
  "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap text-sm font-medium leading-[1.45] no-underline hover:text-foreground";

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
  const deliveryHref = homeDeliveryGuidePath(locale);
  const deliveryLabel = translate(locale, "commerce.deliveryGuideLinkArrow");

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
            <LegalRowText text={text} />
          </li>
        ))}
      </ul>
      {/*
        Link row: flex-wrap + gap-x-3 (no middle ·). A separate · flex item
        would orphan on wrap; both SV/EN labels fit on one line at 390 with
        whitespace-nowrap, so gap alone separates them without a dangling dot.
      */}
      <nav
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-3 gap-y-2",
          TEXT_COLUMN_PL,
        )}
        aria-label={locale === "en" ? "Related links" : "Relaterade länkar"}
      >
        <Link
          href={termsHref}
          className={linkClass}
          style={{ color: LEGAL_FG }}
          data-testid="pdp-legal-terms-link"
        >
          {termsLabel}
        </Link>
        <Link
          href={deliveryHref}
          className={linkClass}
          style={{ color: LEGAL_FG }}
          data-testid="pdp-legal-delivery-link"
        >
          {deliveryLabel}
        </Link>
      </nav>
    </aside>
  );
}
