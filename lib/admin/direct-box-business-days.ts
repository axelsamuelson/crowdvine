/**
 * Business-day helpers for direct_box Access Point dropoff deadlines (admin pick list).
 * Weekends (Sat/Sun) are skipped; no holiday calendar.
 */

/** Add `n` business days to a calendar date (local UTC day components). */
export function addBusinessDays(from: Date, businessDays: number): Date {
  const n = Math.floor(Number(businessDays) || 0);
  if (n <= 0) {
    return new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
  }
  const d = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  let remaining = n;
  while (remaining > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay(); // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6) remaining -= 1;
  }
  return d;
}

/**
 * Target Access Point dropoff day = order date + 3 business days;
 * hard limit = + 5. (Source drops boxes at UPS Access Point; Axel books in portal.)
 */
export function directBoxDropoffDeadlines(orderDate: Date): {
  targetDropoffAt: Date;
  latestDropoffAt: Date;
} {
  return {
    targetDropoffAt: addBusinessDays(orderDate, 3),
    latestDropoffAt: addBusinessDays(orderDate, 5),
  };
}

export function formatIsoDateUTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
