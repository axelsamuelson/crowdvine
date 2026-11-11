/**
 * Direct-box UPS fulfillment dispatch status transitions (admin-only).
 *
 * Allowed:
 *   pending_manual_handoff → booked | skipped | cancelled
 *   booked → completed | cancelled
 */

export const DIRECT_BOX_DISPATCH_STATUSES = [
  "pending_manual_handoff",
  "booked",
  "completed",
  "cancelled",
  "skipped",
] as const;

export type DirectBoxDispatchStatus =
  (typeof DIRECT_BOX_DISPATCH_STATUSES)[number];

export const DIRECT_BOX_DISPATCH_TRANSITIONS: Record<
  DirectBoxDispatchStatus,
  readonly DirectBoxDispatchStatus[]
> = {
  pending_manual_handoff: ["booked", "skipped", "cancelled"],
  booked: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  skipped: [],
};

export function isDirectBoxDispatchStatus(
  value: unknown,
): value is DirectBoxDispatchStatus {
  return (
    typeof value === "string" &&
    (DIRECT_BOX_DISPATCH_STATUSES as readonly string[]).includes(value)
  );
}

/** Treat null/empty as pending_manual_handoff for transition checks. */
export function normalizeDispatchStatus(
  value: string | null | undefined,
): DirectBoxDispatchStatus {
  if (isDirectBoxDispatchStatus(value)) return value;
  return "pending_manual_handoff";
}

export function allowedDispatchTransitions(
  from: string | null | undefined,
): readonly DirectBoxDispatchStatus[] {
  const current = normalizeDispatchStatus(from);
  return DIRECT_BOX_DISPATCH_TRANSITIONS[current];
}

export function canTransitionDispatchStatus(
  from: string | null | undefined,
  to: string,
): boolean {
  if (!isDirectBoxDispatchStatus(to)) return false;
  return allowedDispatchTransitions(from).includes(to);
}

export function assertDispatchTransition(
  from: string | null | undefined,
  to: string,
): DirectBoxDispatchStatus {
  if (!isDirectBoxDispatchStatus(to)) {
    throw new Error(`Invalid fulfillment_dispatch_status: ${to}`);
  }
  if (!canTransitionDispatchStatus(from, to)) {
    const current = normalizeDispatchStatus(from);
    throw new Error(
      `Illegal fulfillment_dispatch_status transition: ${current} → ${to}`,
    );
  }
  return to;
}

export const DISPATCH_STATUS_LABELS_SV: Record<DirectBoxDispatchStatus, string> =
  {
    pending_manual_handoff: "Väntar på upphämtning",
    booked: "Bokad (UPS)",
    completed: "Levererad",
    cancelled: "Avbruten",
    skipped: "Skippad",
  };
