import { z } from "zod";

export const B2B_PALLET_STATUSES = ["inactive", "in_transit", "active"] as const;

export type B2BPalletStatus = (typeof B2B_PALLET_STATUSES)[number];

export const b2bPalletStatusSchema = z.enum(B2B_PALLET_STATUSES);

/**
 * inactive = planerad, syns inte i sortimentet.
 * in_transit = pallen är minst färdigpackad och väntar på upphämtning, eller är på väg.
 *   Vinerna visas som kommande på dirtywine.se.
 * active = levererad, räknas som lager.
 */
export const B2B_PALLET_STATUS_LABELS: Record<B2BPalletStatus, string> = {
  inactive: "Planerad",
  in_transit: "Kommande (packad eller på väg)",
  active: "Levererad (i lager)",
};
