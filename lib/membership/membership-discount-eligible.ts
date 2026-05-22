import {
  isDirtywineHost,
  type PortalSearchParams,
} from "@/lib/b2b-site";

/**
 * Membership tier discounts (e.g. Privilege −15%) apply on pactwines.com only,
 * not on dirtywine.se or localhost with ?b2b=1.
 */
export function isMembershipDiscountEligible(
  host: string | null,
  searchParams?: PortalSearchParams | null,
): boolean {
  return !isDirtywineHost(host, searchParams);
}
