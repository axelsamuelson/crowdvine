/**
 * Finance channel attribution — stable, host/table based.
 */

import type { FinanceChannel } from "@/lib/finance/types";

/**
 * PACT = B2C order_reservations / pallet contribution economics.
 * Dirtywine = dirty_wine_orders (B2B invoice ledger) + dirtywine.se portal.
 * Do not infer from email text or route names alone.
 */
export function parseFinanceChannelParam(
  raw: string | null | undefined,
): FinanceChannel {
  const v = String(raw || "all").toLowerCase();
  if (v === "pact") return "pact";
  if (v === "dirtywine" || v === "dirty_wine" || v === "b2b") return "dirtywine";
  return "all";
}

export function channelLabel(channel: FinanceChannel): string {
  switch (channel) {
    case "pact":
      return "PACT";
    case "dirtywine":
      return "Dirtywine";
    default:
      return "All";
  }
}
