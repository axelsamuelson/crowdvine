import {
  isDirtywineHost,
  type PortalSearchParams,
} from "@/lib/b2b-site";

/**
 * "Your account is not set up for Dirty Wine" is Dirty Wine–only.
 * On pactwines.com the query alone must never show that copy (deep links / stale URLs).
 */
export function shouldShowNoB2bAccessMessage(options: {
  reason?: string | null;
  host: string | null;
  searchParams?: PortalSearchParams | null;
}): boolean {
  if (options.reason !== "no_b2b") return false;
  return isDirtywineHost(options.host, options.searchParams ?? null);
}
