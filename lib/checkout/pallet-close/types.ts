export const PALLET_CLOSE_STATES = [
  "open",
  "choice_pending",
  "extended",
  "charging",
  "closed_charged",
  "pay_link_pending",
  "closed_cancelled",
] as const;

export type PalletCloseState = (typeof PALLET_CLOSE_STATES)[number];

export type PalletCloseChoice = "wait" | "cancel" | "switch_direct";

export type PalletCloseAction = PalletCloseChoice;

export const CHOICE_REPLY_DAYS = 7;
export const PAY_LINK_DAYS = 3;
export const MAX_EXTENSIONS = 1;
export const EXTENSION_DAYS = 28;

export type PalletCloseReservationSnapshot = {
  id: string;
  pallet_id: string | null;
  payment_status: string | null;
  payment_method_id: string | null;
  setup_intent_id: string | null;
  payment_intent_id: string | null;
  status: string | null;
  cancelled_at: string | null;
  charge_deadline_at: string | null;
  pallet_close_state: PalletCloseState | string | null;
  pallet_close_choice: PalletCloseChoice | string | null;
  pallet_close_choice_sent_at: string | null;
  pallet_close_choice_reply_by: string | null;
  pallet_close_extension_count: number | null;
  offsession_charge_failed_at: string | null;
  offsession_pay_by: string | null;
  payment_method_detached_at: string | null;
  pallet_close_charge_idempotency_key: string | null;
};

export type PalletCloseTransition =
  | { type: "deadline_reached_full"; nowIso: string }
  | { type: "deadline_reached_not_full"; nowIso: string; replyByIso: string }
  | { type: "choice_wait"; nowIso: string; newDeadlineIso: string }
  | { type: "choice_cancel"; nowIso: string }
  | { type: "choice_timeout"; nowIso: string }
  | { type: "charge_succeeded"; nowIso: string; idempotencyKey: string }
  | {
      type: "charge_failed";
      nowIso: string;
      payByIso: string;
      paymentLinkUrl: string | null;
    }
  | { type: "pay_link_paid"; nowIso: string }
  | { type: "pay_link_timeout"; nowIso: string };

export type TransitionResult =
  | {
      ok: true;
      next: Partial<PalletCloseReservationSnapshot> & {
        pallet_close_state: PalletCloseState;
      };
      sideEffects: Array<
        | "send_choice_email"
        | "send_charged_email"
        | "send_cancelled_email"
        | "send_payment_failed_email"
        | "detach_payment_method"
        | "charge_offsession"
        | "create_payment_link"
      >;
    }
  | { ok: false; reason: string };
