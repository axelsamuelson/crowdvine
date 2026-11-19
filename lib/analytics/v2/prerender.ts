/**
 * D1 prerender-suspect rule — TS mirror of analytics_is_prerender_suspect().
 * Provisional until E4/E5 verified (spec §6.1, bilaga B).
 */

const D1_SINCE_MS = Date.parse("2026-11-02T00:00:00.000Z");

export type PrerenderSuspectInput = {
  startedAt: string | Date | number | null | undefined;
  landingUrl: string | null | undefined;
  referrer: string | null | undefined;
  userAgent: string | null | undefined;
  engaged: boolean | null | undefined;
};

/**
 * D1: Chrome iOS prerender Google → /wine without query, no engagement.
 * Landing must be exactly `https?://host/wine` (no trailing path/query).
 */
export function isPrerenderSuspect(input: PrerenderSuspectInput): boolean {
  const started =
    input.startedAt == null
      ? NaN
      : input.startedAt instanceof Date
        ? input.startedAt.getTime()
        : typeof input.startedAt === "number"
          ? input.startedAt
          : Date.parse(String(input.startedAt));

  if (!Number.isFinite(started) || started < D1_SINCE_MS) return false;

  const ua = input.userAgent ?? "";
  if (!ua.includes("CriOS")) return false;

  const referrer = (input.referrer ?? "").toLowerCase();
  if (!referrer.includes("google")) return false;

  if (input.engaged === true) return false;

  const landing = input.landingUrl ?? "";
  // Match SQL: ^https?://[^/]+/wine$
  if (!/^https?:\/\/[^/]+\/wine$/i.test(landing)) return false;

  return true;
}
