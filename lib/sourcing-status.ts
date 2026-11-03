import { z } from "zod";

export const SOURCING_STATUSES = [
  "available",
  "allocation",
  "unavailable",
] as const;

export type SourcingStatus = (typeof SOURCING_STATUSES)[number];

export const sourcingStatusSchema = z.enum(SOURCING_STATUSES);

export const ALLOCATION_SOURCING_WARNING = "sourcing_allocation";

export class WineNotSourceableError extends Error {
  readonly status = 409;

  constructor() {
    super("wine_not_sourceable");
    this.name = "WineNotSourceableError";
  }
}

export class InvalidSourcingStatusError extends Error {
  constructor() {
    super("Invalid sourcing_status");
    this.name = "InvalidSourcingStatusError";
  }
}

export function readSourcingStatus(value: unknown): SourcingStatus {
  const parsed = sourcingStatusSchema.safeParse(value);
  if (!parsed.success) throw new InvalidSourcingStatusError();
  return parsed.data;
}

/** Reject going live when the wine cannot be bought. Allocation stays live with a warning. */
export function sourcingPublishResult(
  goingLive: boolean,
  status: SourcingStatus,
): { warning?: typeof ALLOCATION_SOURCING_WARNING } {
  if (!goingLive) return {};
  if (status === "unavailable") throw new WineNotSourceableError();
  if (status === "allocation") return { warning: ALLOCATION_SOURCING_WARNING };
  return {};
}
