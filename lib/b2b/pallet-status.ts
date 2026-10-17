import { z } from "zod";

export const B2B_PALLET_STATUSES = ["inactive", "in_transit", "active"] as const;

export type B2BPalletStatus = (typeof B2B_PALLET_STATUSES)[number];

export const b2bPalletStatusSchema = z.enum(B2B_PALLET_STATUSES);

export const B2B_PALLET_STATUS_LABELS: Record<B2BPalletStatus, string> = {
  inactive: "Planerad",
  in_transit: "På väg",
  active: "Levererad (i lager)",
};
