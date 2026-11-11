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

/** Badge / list labels (status nouns). */
export const DISPATCH_STATUS_LABELS_SV: Record<DirectBoxDispatchStatus, string> =
  {
    pending_manual_handoff: "Väntar på upphämtning",
    booked: "Bokad",
    completed: "Levererad",
    cancelled: "Avbruten",
    skipped: "Skippad",
  };

/** Verb labels for status transition buttons (not used for cancelled). */
export const DISPATCH_STATUS_ACTION_LABELS_SV: Partial<
  Record<DirectBoxDispatchStatus, string>
> = {
  booked: "Markera som bokad",
  skipped: "Hoppa över",
  completed: "Markera som levererad",
};

/** Admin status badge colour classes (pattern: bg-*-100 text-*-700 + dark). */
export const DISPATCH_STATUS_BADGE_CLASS: Record<DirectBoxDispatchStatus, string> =
  {
    pending_manual_handoff:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    completed:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    skipped: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
