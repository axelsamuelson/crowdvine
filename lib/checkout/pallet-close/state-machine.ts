/**
 * Pure shared-pallet close-flow transitions (no I/O).
 * Cron / API layers apply sideEffects after a successful transition.
 */

import {
  MAX_EXTENSIONS,
  type PalletCloseReservationSnapshot,
  type PalletCloseState,
  type PalletCloseTransition,
  type TransitionResult,
} from "@/lib/checkout/pallet-close/types";

function stateOf(row: PalletCloseReservationSnapshot): PalletCloseState {
  const raw = String(row.pallet_close_state ?? "open").trim();
  if (
    raw === "choice_pending" ||
    raw === "extended" ||
    raw === "charging" ||
    raw === "closed_charged" ||
    raw === "pay_link_pending" ||
    raw === "closed_cancelled"
  ) {
    return raw;
  }
  return "open";
}

function isTerminalPaidOrCancelled(row: PalletCloseReservationSnapshot): boolean {
  if (row.cancelled_at) return true;
  if (String(row.payment_status) === "paid") return true;
  const s = stateOf(row);
  return s === "closed_charged" || s === "closed_cancelled";
}

export function applyPalletCloseTransition(
  row: PalletCloseReservationSnapshot,
  event: PalletCloseTransition,
): TransitionResult {
  if (isTerminalPaidOrCancelled(row) && event.type !== "pay_link_paid") {
    return { ok: false, reason: "terminal_state" };
  }

  const current = stateOf(row);

  switch (event.type) {
    case "deadline_reached_full": {
      if (current !== "open" && current !== "extended") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: { pallet_close_state: "charging" },
        sideEffects: ["charge_offsession"],
      };
    }

    case "deadline_reached_not_full": {
      if (current !== "open" && current !== "extended") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      if (row.pallet_close_choice_sent_at) {
        return { ok: false, reason: "choice_already_sent" };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "choice_pending",
          pallet_close_choice_sent_at: event.nowIso,
          pallet_close_choice_reply_by: event.replyByIso,
        },
        sideEffects: ["send_choice_email"],
      };
    }

    case "choice_wait": {
      if (current !== "choice_pending") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      const extensions = Number(row.pallet_close_extension_count) || 0;
      if (extensions >= MAX_EXTENSIONS) {
        return { ok: false, reason: "extension_limit" };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "extended",
          pallet_close_choice: "wait",
          pallet_close_choice_at: event.nowIso,
          pallet_close_extension_count: extensions + 1,
          charge_deadline_at: event.newDeadlineIso,
          pallet_close_choice_reply_by: null,
        },
        sideEffects: [],
      };
    }

    case "choice_cancel": {
      if (current !== "choice_pending") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "closed_cancelled",
          pallet_close_choice: "cancel",
          pallet_close_choice_at: event.nowIso,
          cancelled_at: event.nowIso,
        },
        sideEffects: ["detach_payment_method", "send_cancelled_email"],
      };
    }

    case "choice_timeout": {
      if (current !== "choice_pending") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "closed_cancelled",
          cancelled_at: event.nowIso,
        },
        sideEffects: ["detach_payment_method", "send_cancelled_email"],
      };
    }

    case "charge_succeeded": {
      if (current !== "charging" && current !== "pay_link_pending") {
        // Idempotent success if already charged
        if (current === "closed_charged" || String(row.payment_status) === "paid") {
          return { ok: false, reason: "already_charged" };
        }
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "closed_charged",
          payment_status: "paid",
          pallet_close_charge_idempotency_key: event.idempotencyKey,
          offsession_pay_by: null,
        },
        sideEffects: ["send_charged_email"],
      };
    }

    case "charge_failed": {
      if (current !== "charging") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "pay_link_pending",
          payment_status: "failed",
          offsession_charge_failed_at: event.nowIso,
          offsession_pay_by: event.payByIso,
          offsession_payment_link_url: event.paymentLinkUrl,
        },
        sideEffects: ["create_payment_link", "send_payment_failed_email"],
      };
    }

    case "pay_link_paid": {
      if (current !== "pay_link_pending" && String(row.payment_status) !== "failed") {
        if (current === "closed_charged") {
          return { ok: false, reason: "already_charged" };
        }
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "closed_charged",
          payment_status: "paid",
          offsession_pay_by: null,
        },
        sideEffects: ["send_charged_email"],
      };
    }

    case "pay_link_timeout": {
      if (current !== "pay_link_pending") {
        return { ok: false, reason: `invalid_state:${current}` };
      }
      return {
        ok: true,
        next: {
          pallet_close_state: "closed_cancelled",
          cancelled_at: event.nowIso,
        },
        sideEffects: ["detach_payment_method", "send_cancelled_email"],
      };
    }

    default:
      return { ok: false, reason: "unknown_event" };
  }
}

/** Stripe / DB idempotency key for close charge (stable per reservation+deadline). */
export function buildPalletCloseChargeIdempotencyKey(opts: {
  reservationId: string;
  chargeDeadlineAt: string | null;
}): string {
  const deadline = opts.chargeDeadlineAt?.trim() || "no_deadline";
  return `pallet_close_charge:${opts.reservationId}:${deadline}`;
}
