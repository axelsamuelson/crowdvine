/**
 * Re-export D1 rule under the name used by some call sites.
 * Canonical implementation: ./prerender.ts
 */

export {
  isPrerenderSuspect,
  type PrerenderSuspectInput,
} from "@/lib/analytics/v2/prerender";
