import {
  isDirtywineHost,
  isDirtywineProductionHost,
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

/**
 * Dirty Wine is open: `/access-request?reason=no_b2b` (invite / go-to-pact copy)
 * is obsolete. Permanently redirect to `/` on dirtywine.se / www only.
 * pactwines.com and all other reasons stay unchanged.
 */
export function shouldRedirectDirtywineNoB2bAccessRequest(options: {
  pathname: string;
  reason?: string | null;
  host: string | null;
}): boolean {
  if (options.pathname !== "/access-request") return false;
  if (options.reason !== "no_b2b") return false;
  return isDirtywineProductionHost(options.host);
}
