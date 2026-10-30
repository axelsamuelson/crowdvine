import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
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
  payment_status?: string | null;
  payment_method_id?: string | null;
  setup_intent_id?: string | null;
  extension_ask_sent_at?: string | null;
  extension_ask_milestone_day?: number | null;
  extension_reply_by?: string | null;
  extensions_confirmed_count?: number | null;
  expiry_admin_flag?: string | null;
};

export type ExpiryPalletRow = {
  id?: string;
  status?: string | null;
  is_complete?: boolean | null;
};

export type ExpiryDecision =
  | { action: "skip"; reason: string }
  | { action: "flag_charged"; reason: "already_charged" }
  | { action: "hard_expire"; reason: "max_age" }
  | { action: "cancel_no_reply"; reason: "extension_not_confirmed" }
  | {
      action: "send_extension_ask";
      milestoneDay: number;
      replyBy: Date;
    }
  | { action: "wait"; reason: string };

export function absoluteExpiryAt(
  createdAt: Date,
  maxAgeDays: number,
): Date {
  return new Date(createdAt.getTime() + maxAgeDays * DAY_MS);
}

/**
 * Next milestone day index from confirmed extension count.
 * With unlimited cap: 30, 60, 90, … forever.
 * With a finite cap: only milestones strictly before maxAgeDays.
 */
export function nextExtensionMilestoneDay(
  confirmedCount: number,
  extensionDays: number,
  maxAgeDays: number | null,
): number | null {
  if (extensionDays <= 0) return null;
  const confirmed = Math.max(0, Math.floor(confirmedCount));
  const day = (confirmed + 1) * extensionDays;
  if (maxAgeDays != null && day >= maxAgeDays) return null;
  return day;
}

export function milestoneAt(createdAt: Date, milestoneDay: number): Date {
  return new Date(createdAt.getTime() + milestoneDay * DAY_MS);
}

export function parseCreatedAt(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Pallet still waiting on volume / not confirmed for ship.
 * Complete or shipping-locked pallets are outside the §3 "not filled" rule.
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
 * Callers still enforce feature flags / dry-run / email send.
 */
export function decideReservationExpiryAction(
  row: ExpiryReservationRow,
  pallet: ExpiryPalletRow | null,
  now: Date,
  config: Pick<
    ReservationExpiryConfig,
    "maxAgeDays" | "extensionDays" | "replyDays"
  >,
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

  if (config.maxAgeDays != null) {
    const absEnd = absoluteExpiryAt(createdAt, config.maxAgeDays);
    if (now.getTime() >= absEnd.getTime()) {
      return { action: "hard_expire", reason: "max_age" };
    }
  }

  const replyByRaw = row.extension_reply_by;
  const hasOpenAsk =
    typeof replyByRaw === "string" &&
    replyByRaw.trim() !== "" &&
    row.extension_ask_sent_at != null;

  if (hasOpenAsk) {
    const replyBy = new Date(replyByRaw!);
    if (!Number.isFinite(replyBy.getTime())) {
      return { action: "skip", reason: "invalid_reply_by" };
    }
    if (now.getTime() > replyBy.getTime()) {
      return {
        action: "cancel_no_reply",
        reason: "extension_not_confirmed",
      };
    }
    return { action: "wait", reason: "awaiting_extension_reply" };
  }

  const confirmed = Math.max(
    0,
    Math.floor(Number(row.extensions_confirmed_count) || 0),
  );
  const nextMilestone = nextExtensionMilestoneDay(
    confirmed,
    config.extensionDays,
    config.maxAgeDays,
  );
  if (nextMilestone == null) {
    return {
      action: "wait",
      reason: "no_further_milestones_before_max_age",
    };
  }

  const dueAt = milestoneAt(createdAt, nextMilestone);
  if (now.getTime() < dueAt.getTime()) {
    return { action: "wait", reason: "before_next_milestone" };
  }

  const replyBy = new Date(now.getTime() + config.replyDays * DAY_MS);
  return {
    action: "send_extension_ask",
    milestoneDay: nextMilestone,
    replyBy,
  };
}
