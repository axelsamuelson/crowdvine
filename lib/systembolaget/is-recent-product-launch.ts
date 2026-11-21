import {
  launchDateKey,
  stockholmDateKey,
} from "@/lib/guides/systembolaget-release-groups";

/** Inclusive calendar-day window for the Systembolaget launch «NY» / «NEW» badge. */
export const PRODUCT_LAUNCH_BADGE_WINDOW_DAYS = 30;

function addCalendarDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map((part) => Number(part));
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utc.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * True when `product_launch_date` falls on a Europe/Stockholm calendar day that
 * is in the future, today, or at most {@link PRODUCT_LAUNCH_BADGE_WINDOW_DAYS}
 * days in the past. Null / unparseable dates never qualify.
 *
 * Comparison is calendar dates only (not wall-clock hours). Pass `now` in tests
 * to pin the Stockholm "today" boundary, including midnight CET/CEST edges.
 */
export function isRecentProductLaunch(
  productLaunchDate: string | null | undefined,
  now: Date = new Date(),
  windowDays: number = PRODUCT_LAUNCH_BADGE_WINDOW_DAYS,
): boolean {
  const launchKey = launchDateKey(productLaunchDate);
  if (!launchKey) return false;
  if (!Number.isFinite(windowDays) || windowDays < 0) return false;

  const todayKey = stockholmDateKey(now);
  const earliestKey = addCalendarDays(todayKey, -windowDays);
  // Future and today are included; day 30 is included; day 31 is not.
  return launchKey >= earliestKey;
}
