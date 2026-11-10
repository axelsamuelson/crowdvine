/**
 * Heads-up + sold-out choice emails for coverage close.
 *
 * ALL customer-facing copy below is PLACEHOLDER — TODO(Juliette/Margaux).
 * Axel must approve word for word before enabling send.
 * Do not edit content/legal/*.
 */

import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type CoverageCloseEmailLocale = "sv" | "en";

/** TODO(Juliette/Margaux): heads-up when lock is scheduled. */
export function buildPalletLockHeadsUpEmail(opts: {
  locale: CoverageCloseEmailLocale;
  customerName: string;
  /** Formatted amount string already localized by caller. */
  amountLabel: string;
  /** Formatted lock/charge date. */
  lockDateLabel: string;
  cancelUrl: string;
  reservationId: string;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");

  if (opts.locale === "sv") {
    const subject =
      "TODO(Juliette/Margaux): Pallen planeras att låsas — placeholder";
    const text = `TODO(Juliette/Margaux) Hej ${name},

Belopp: ${opts.amountLabel}
Lås- och debiteringsdatum: ${opts.lockDateLabel}
Avboka: ${opts.cancelUrl}

Order: ${opts.reservationId}
`;
    const html = `<p>TODO(Juliette/Margaux) Hej ${escapeHtmlBasic(name)},</p>
<p>Belopp: <strong>${escapeHtmlBasic(opts.amountLabel)}</strong></p>
<p>Lås- och debiteringsdatum: <strong>${escapeHtmlBasic(opts.lockDateLabel)}</strong></p>
<p><a href="${escapeHtmlBasic(opts.cancelUrl)}">Avboka</a></p>
<p>Order: ${escapeHtmlBasic(opts.reservationId)}</p>`;
    return { subject, html, text };
  }

  const subject =
    "TODO(Juliette/Margaux): Pallet lock scheduled — placeholder";
  const text = `TODO(Juliette/Margaux) Hi ${name},

Amount: ${opts.amountLabel}
Lock and charge date: ${opts.lockDateLabel}
Cancel: ${opts.cancelUrl}

Order: ${opts.reservationId}
`;
  const html = `<p>TODO(Juliette/Margaux) Hi ${escapeHtmlBasic(name)},</p>
<p>Amount: <strong>${escapeHtmlBasic(opts.amountLabel)}</strong></p>
<p>Lock and charge date: <strong>${escapeHtmlBasic(opts.lockDateLabel)}</strong></p>
<p><a href="${escapeHtmlBasic(opts.cancelUrl)}">Cancel</a></p>
<p>Order: ${escapeHtmlBasic(opts.reservationId)}</p>`;
  return { subject, html, text };
}

/** TODO(Juliette/Margaux): sold-out wine choice email. */
export function buildSoldOutChoiceEmail(opts: {
  locale: CoverageCloseEmailLocale;
  customerName: string;
  wineTitle: string;
  choiceUrl: string;
  replyByLabel: string;
  reservationId: string;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");

  if (opts.locale === "sv") {
    const subject =
      "TODO(Juliette/Margaux): Ett vin är slut — välj ersättning eller ta bort";
    const text = `TODO(Juliette/Margaux) Hej ${name},

Vinet "${opts.wineTitle}" är inte tillgängligt när pallen låses.
Välj ersättning eller ta bort (debiteras inte): ${opts.choiceUrl}
Svara senast: ${opts.replyByLabel}

Order: ${opts.reservationId}
`;
    const html = `<p>TODO(Juliette/Margaux) Hej ${escapeHtmlBasic(name)},</p>
<p>Vinet "<strong>${escapeHtmlBasic(opts.wineTitle)}</strong>" är inte tillgängligt när pallen låses.</p>
<p><a href="${escapeHtmlBasic(opts.choiceUrl)}">Välj ersättning eller ta bort</a></p>
<p>Svara senast: ${escapeHtmlBasic(opts.replyByLabel)}</p>
<p>Order: ${escapeHtmlBasic(opts.reservationId)}</p>`;
    return { subject, html, text };
  }

  const subject =
    "TODO(Juliette/Margaux): A wine is unavailable — choose a replacement or remove";
  const text = `TODO(Juliette/Margaux) Hi ${name},

"${opts.wineTitle}" is unavailable when the pallet locks.
Choose a replacement or remove (not charged): ${opts.choiceUrl}
Reply by: ${opts.replyByLabel}

Order: ${opts.reservationId}
`;
  const html = `<p>TODO(Juliette/Margaux) Hi ${escapeHtmlBasic(name)},</p>
<p>"<strong>${escapeHtmlBasic(opts.wineTitle)}</strong>" is unavailable when the pallet locks.</p>
<p><a href="${escapeHtmlBasic(opts.choiceUrl)}">Choose a replacement or remove</a></p>
<p>Reply by: ${escapeHtmlBasic(opts.replyByLabel)}</p>
<p>Order: ${escapeHtmlBasic(opts.reservationId)}</p>`;
  return { subject, html, text };
}
