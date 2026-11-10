import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import { isReservationOwnedByPalletCloseFlow } from "@/lib/checkout/pallet-close/lifecycle-ownership";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { isPalletShippingLocked } from "@/lib/pallet-ship-progress";
import {
  DAY_MS,
  type ReservationExpiryConfig,
} from "@/lib/reservations/expiry-config";
import {
  isReservationArchived,
  NON_ACTIVE_RESERVATION_STATUSES,
} from "@/lib/reservations/archive";

const FILL_STATUS_SET = new Set<string>(
  PALLET_FILL_STATUSES.map((s) => s.toLowerCase()),
);
const NON_ACTIVE_SET = new Set<string>(
  NON_ACTIVE_RESERVATION_STATUSES.map((s) => s.toLowerCase()),
);

export type ExpiryReservationRow = {
  id: string;
  status?: string | null;
  archived_at?: string | null;
  created_at?: string | null;
  pallet_id?: string | null;
  fulfillment_channel?: string | null;
  payment_mode?: string | null;
  pallet_close_state?: string | null;
  payment_status?: string | null;
  payment_method_id?: string | null;
  setup_intent_id?: string | null;
  total_sek?: number | string | null;
  /** Reused: last status-email period day sent (28, 56, …). */
  extension_ask_sent_at?: string | null;
  extension_ask_milestone_day?: number | null;
  /** Legacy open ask deadline — ignored for cancellation (Axel 2026-11-10). */
  extension_reply_by?: string | null;
  extensions_confirmed_count?: number | null;
  expiry_admin_flag?: string | null;
};

export type ExpiryPalletRow = {
  id?: string;
  status?: string | null;
  is_complete?: boolean | null;
  bottle_capacity?: number | null;
  min_bottles_to_complete?: number | null;
};

export type ExpiryDecision =
  | { action: "skip"; reason: string }
  | { action: "flag_charged"; reason: "already_charged" }
  | {
      action: "send_status_email";
      periodDay: number;
    }
  | { action: "wait"; reason: string };

/** @deprecated Use send_status_email — kept for type narrowing in old tests. */
export type LegacyExpiryDecision =
  | ExpiryDecision
  | { action: "hard_expire"; reason: "max_age" }
  | { action: "cancel_no_reply"; reason: "extension_not_confirmed" }
  | {
      action: "send_extension_ask";
      milestoneDay: number;
      replyBy: Date;
    };

export function absoluteExpiryAt(
  createdAt: Date,
  maxAgeDays: number,
): Date {
  return new Date(createdAt.getTime() + maxAgeDays * DAY_MS);
}

/**
 * Next status-email period day from last sent period.
 * Periods are intervalDays, 2*intervalDays, … (e.g. 28, 56, 84).
 */
export function nextStatusPeriodDay(
  lastSentPeriodDay: number | null | undefined,
  intervalDays: number,
): number {
  if (intervalDays <= 0) return intervalDays;
  const last = Math.max(0, Math.floor(Number(lastSentPeriodDay) || 0));
  if (last <= 0) return intervalDays;
  return last + intervalDays;
}

/** @deprecated Alias — status cadence replaced extension milestones. */
export function nextExtensionMilestoneDay(
  confirmedCount: number,
  extensionDays: number,
  _maxAgeDays: number | null,
): number | null {
  if (extensionDays <= 0) return null;
  const confirmed = Math.max(0, Math.floor(confirmedCount));
  return (confirmed + 1) * extensionDays;
}

export function milestoneAt(createdAt: Date, milestoneDay: number): Date {
  return new Date(createdAt.getTime() + milestoneDay * DAY_MS);
}

/**
 * Highest period day due at `now` (multiple of intervalDays), or null if
 * the order is younger than one full interval.
 */
export function dueStatusPeriodDay(
  createdAt: Date,
  now: Date,
  intervalDays: number,
): number | null {
  if (intervalDays <= 0) return null;
  const ageMs = now.getTime() - createdAt.getTime();
  if (ageMs < intervalDays * DAY_MS) return null;
  const ageDays = Math.floor(ageMs / DAY_MS);
  const period = Math.floor(ageDays / intervalDays) * intervalDays;
  return period >= intervalDays ? period : null;
}

export function parseCreatedAt(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Pallet still waiting on volume / not confirmed for ship.
 * Complete or shipping-locked pallets are outside status-email scope.
 */
export function isPalletStillAwaitingFill(
  pallet: ExpiryPalletRow | null,
): boolean {
  if (!pallet) return false;
  if (pallet.is_complete === true) return false;
  const status = String(pallet.status ?? "").trim().toLowerCase();
  if (!status) return true;
  if (isPalletShippingLocked(status)) return false;
  if (status === "complete") return false;
  return true;
}

export function isActivePalletReservationStatus(
  status: string | null | undefined,
): boolean {
  const st = String(status ?? "").trim().toLowerCase();
  if (!st || NON_ACTIVE_SET.has(st)) return false;
  return FILL_STATUS_SET.has(st);
}

export function isAlreadyCharged(row: {
  payment_status?: string | null;
}): boolean {
  return String(row.payment_status ?? "").trim().toLowerCase() === "paid";
}

/**
 * Pure decision for one reservation at `now`.
 * Never auto-cancels (Axel 2026-11-10): no cancel_no_reply, no hard_expire.
 * Legacy open extension_reply_by rows are treated as ordinary open orders.
 */
export function decideReservationExpiryAction(
  row: ExpiryReservationRow,
  pallet: ExpiryPalletRow | null,
  now: Date,
  config: Pick<ReservationExpiryConfig, "statusIntervalDays" | "extensionDays" | "replyDays" | "maxAgeDays">,
  opts: { palletCloseFlowEnabled?: boolean } = {},
): ExpiryDecision {
  if (isReservationArchived(row)) {
    return { action: "skip", reason: "archived" };
  }
  if (!isActivePalletReservationStatus(row.status)) {
    return { action: "skip", reason: "inactive_status" };
  }
  if (!isPalletBasedReservation(row)) {
    return { action: "skip", reason: "not_pallet_based" };
  }
  if (
    isReservationOwnedByPalletCloseFlow(row, {
      palletCloseFlowEnabled: opts.palletCloseFlowEnabled === true,
    })
  ) {
    return { action: "skip", reason: "pallet_close_flow_owns" };
  }
  if (!isPalletStillAwaitingFill(pallet)) {
    return { action: "skip", reason: "pallet_ready_or_locked" };
  }

  const createdAt = parseCreatedAt(row.created_at);
  if (!createdAt) {
    return { action: "skip", reason: "missing_created_at" };
  }

  if (isAlreadyCharged(row)) {
    return { action: "flag_charged", reason: "already_charged" };
  }

  // Intentionally ignore extension_reply_by / maxAgeDays: never cancel.
  const interval =
    typeof config.statusIntervalDays === "number" && config.statusIntervalDays > 0
      ? config.statusIntervalDays
      : typeof config.extensionDays === "number" && config.extensionDays > 0
        ? config.extensionDays
        : 28;

  const duePeriod = dueStatusPeriodDay(createdAt, now, interval);
  if (duePeriod == null) {
    return { action: "wait", reason: "before_next_milestone" };
  }

  const lastSent = Math.max(
    0,
    Math.floor(Number(row.extension_ask_milestone_day) || 0),
  );
  if (lastSent >= duePeriod) {
    return { action: "wait", reason: "status_already_sent_for_period" };
  }

  return {
    action: "send_status_email",
    periodDay: duePeriod,
  };
}
