/**
 * Pure helpers for the 3-day failed-charge pay window.
 * Keeps legacy payment-retry from overwriting pallet-close pay_link fields.
 */

export const PAYMENT_RETRY_PAY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const PAYMENT_RETRY_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Pallet-close states that own offsession_charge_failed_at / offsession_pay_by. */
export const PALLET_CLOSE_OWNS_PAY_WINDOW_STATES = new Set([
  "pay_link_pending",
  "charging",
]);

export function palletCloseOwnsPayWindow(
  palletCloseState: string | null | undefined,
): boolean {
  const s = String(palletCloseState ?? "")
    .trim()
    .toLowerCase();
  return PALLET_CLOSE_OWNS_PAY_WINDOW_STATES.has(s);
}

/**
 * Whether the legacy payment-retry path may write offsession_* pay-window columns.
 * Never when pallet-close owns them.
 */
export function paymentRetryMayWritePayWindow(
  palletCloseState: string | null | undefined,
): boolean {
  return !palletCloseOwnsPayWindow(palletCloseState);
}

export type PayWindowResolution =
  | { kind: "skip_owned_by_pallet_close" }
  | {
      kind: "reuse";
      windowStartedAt: Date;
      payByAt: Date;
      windowOpened: false;
    }
  | {
      kind: "open";
      windowStartedAt: Date;
      payByAt: Date;
      windowOpened: true;
    };

/**
 * Resolve the 3-day pay window without clobbering pallet-close's dates.
 * When an existing window is present and we may write, reuse it (same pay-by).
 */
export function resolvePaymentRetryPayWindow(opts: {
  now: Date;
  palletCloseState: string | null | undefined;
  existingFailedAt: string | null | undefined;
  existingPayBy: string | null | undefined;
}): PayWindowResolution {
  if (palletCloseOwnsPayWindow(opts.palletCloseState)) {
    return { kind: "skip_owned_by_pallet_close" };
  }

  const failedRaw =
    typeof opts.existingFailedAt === "string" && opts.existingFailedAt.trim()
      ? new Date(opts.existingFailedAt)
      : null;
  const payByRaw =
    typeof opts.existingPayBy === "string" && opts.existingPayBy.trim()
      ? new Date(opts.existingPayBy)
      : null;

  if (
    failedRaw &&
    payByRaw &&
    Number.isFinite(failedRaw.getTime()) &&
    Number.isFinite(payByRaw.getTime())
  ) {
    return {
      kind: "reuse",
      windowStartedAt: failedRaw,
      payByAt: payByRaw,
      windowOpened: false,
    };
  }

  const windowStartedAt = opts.now;
  const payByAt = new Date(
    windowStartedAt.getTime() + PAYMENT_RETRY_PAY_WINDOW_MS,
  );
  return {
    kind: "open",
    windowStartedAt,
    payByAt,
    windowOpened: true,
  };
}

/**
 * Pure decision: cancel after the 3-day window, otherwise schedule the next retry.
 */
export function decidePaymentRetrySchedule(opts: {
  now: Date;
  windowStartedAt: Date;
}):
  | { action: "cancel"; payByAt: Date }
  | { action: "schedule"; at: Date; payByAt: Date } {
  const payByAt = new Date(
    opts.windowStartedAt.getTime() + PAYMENT_RETRY_PAY_WINDOW_MS,
  );
  if (opts.now.getTime() >= payByAt.getTime()) {
    return { action: "cancel", payByAt };
  }
  const candidate = new Date(opts.now.getTime() + PAYMENT_RETRY_INTERVAL_MS);
  const at = candidate.getTime() > payByAt.getTime() ? payByAt : candidate;
  if (at.getTime() <= opts.now.getTime() + 60_000) {
    return { action: "cancel", payByAt };
  }
  return { action: "schedule", at, payByAt };
}
