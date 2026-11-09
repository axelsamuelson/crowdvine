/**
 * Pure eligibility for late-delivery cancel-for-full-refund.
 * Clock: 30 days after pallet close; option hidden once a delivery day is set
 * or the reservation is already cancelled.
 */

export const LATE_DELIVERY_CANCEL_AFTER_DAYS = 30;
export const LATE_DELIVERY_REFUND_WITHIN_DAYS = 14;

export function addUtcDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isLateDeliveryCancelEligible(input: {
  closedAt: string | Date | null | undefined;
  deliveryDay: string | null | undefined;
  cancelledAt?: string | Date | null | undefined;
  lateDeliveryCancelAt?: string | Date | null | undefined;
  now?: Date;
}): boolean {
  if (input.cancelledAt) return false;
  if (input.lateDeliveryCancelAt) return false;
  if (input.deliveryDay && String(input.deliveryDay).trim()) return false;
  if (!input.closedAt) return false;

  const closed =
    input.closedAt instanceof Date
      ? input.closedAt
      : new Date(String(input.closedAt));
  if (Number.isNaN(closed.getTime())) return false;

  const now = input.now ?? new Date();
  const eligibleFrom = addUtcDays(closed, LATE_DELIVERY_CANCEL_AFTER_DAYS);
  return now.getTime() >= eligibleFrom.getTime();
}

export function refundPromisedByIso(
  cancelAt: Date = new Date(),
): string {
  return addUtcDays(cancelAt, LATE_DELIVERY_REFUND_WITHIN_DAYS).toISOString();
}

/** Idempotent email_type keys (unique with reservation_id in email_sends). */
export const PALLET_DELIVERY_EMAIL_TYPES = {
  shipped: "pallet_delivery_shipped",
  deliveryDay: "pallet_delivery_day",
  /** One delay notice per expected-date value per reservation. */
  delayForDate: (isoDate: string) =>
    `pallet_delivery_delay:${String(isoDate).trim().slice(0, 10)}`,
} as const;
