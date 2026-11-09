/**
 * Close-flow "switch to direct" entry via /checkout?pallet_close_switch=…
 *
 * Requires DIRECT_BOX_CHECKOUT_ENABLED. Always demands a fresh quote and a new
 * explicit acceptance — never reuses the shared-pallet quote/acceptance.
 */

import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";

export type PalletCloseSwitchDirectEntry =
  | {
      ok: true;
      reservationId: string;
      /** Caller must mint a new direct_box quote (never reuse shared). */
      requireNewQuote: true;
      /** Caller must clear prior acceptance and require explicit accept. */
      requireExplicitAcceptance: true;
      preferredFulfillment: "direct_box";
    }
  | {
      ok: false;
      reason:
        | "not_requested"
        | "missing_reservation_id"
        | "direct_box_disabled";
    };

function firstParam(
  value: string | string[] | undefined | null,
): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/**
 * Resolve entry from checkout search params.
 * Unreachable when DIRECT_BOX_CHECKOUT_ENABLED is false.
 */
export function resolvePalletCloseSwitchDirectEntry(opts: {
  palletCloseSwitch?: string | string[] | null;
  fulfillment?: string | string[] | null;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): PalletCloseSwitchDirectEntry {
  const reservationId = firstParam(opts.palletCloseSwitch).trim();
  if (!reservationId) {
    return { ok: false, reason: "not_requested" };
  }

  if (!isDirectBoxCheckoutEnabled(opts.env ?? process.env)) {
    return { ok: false, reason: "direct_box_disabled" };
  }

  return {
    ok: true,
    reservationId,
    requireNewQuote: true,
    requireExplicitAcceptance: true,
    preferredFulfillment: "direct_box",
  };
}
