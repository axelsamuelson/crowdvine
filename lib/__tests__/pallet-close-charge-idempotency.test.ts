import { beforeEach, describe, expect, it, vi } from "vitest";

const chargeOneSetupIntentReservation = vi.fn();
const getOrCreateStripeCustomer = vi.fn();
const paymentIntentsCreate = vi.fn();
const setupIntentsRetrieve = vi.fn();

const updates: Array<{ payload: Record<string, unknown>; filters: string[] }> =
  [];

function chainable(result: { data: unknown; error: null | { message: string } }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = (_c: string, _v: unknown) => api;
  api.is = (_c: string, _v: unknown) => api;
  api.neq = (_c: string, _v: unknown) => api;
  api.maybeSingle = async () => result;
  api.single = async () => result;
  return api;
}

vi.mock("@/lib/reservation-auto-charge", () => ({
  chargeOneSetupIntentReservation: (...args: unknown[]) =>
    chargeOneSetupIntentReservation(...args),
}));

vi.mock("@/lib/stripe/customer", () => ({
  getOrCreateStripeCustomer: (...args: unknown[]) =>
    getOrCreateStripeCustomer(...args),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    paymentIntents: { create: (...args: unknown[]) => paymentIntentsCreate(...args) },
    setupIntents: {
      retrieve: (...args: unknown[]) => setupIntentsRetrieve(...args),
    },
  },
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== "order_reservations") {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        update: (payload: Record<string, unknown>) => {
          const filters: string[] = [];
          const api = {
            eq: (c: string, v: unknown) => {
              filters.push(`${c}=${String(v)}`);
              return api;
            },
            is: (c: string, v: unknown) => {
              filters.push(`${c} is ${String(v)}`);
              return api;
            },
            select: () => api,
            maybeSingle: async () => {
              updates.push({ payload, filters: [...filters] });
              // First claim succeeds
              if (
                payload.pallet_close_state === "charging" &&
                !filters.includes("claimed-twice")
              ) {
                return { data: { id: "res-1" }, error: null };
              }
              return { data: { id: "res-1", payment_intent_id: "pi_1" }, error: null };
            },
          };
          return api;
        },
        select: () =>
          chainable({
            data: {
              id: "res-1",
              user_id: "user-1",
              payment_mode: "setup_intent",
              payment_status: "pending",
              payment_method_id: "pm_1",
              setup_intent_id: "seti_1",
              payment_attempts: 0,
              is_conditional: false,
              charge_blocked_reason: null,
              terms_version: "v1",
              terms_accepted_at: "2026-01-01T00:00:00.000Z",
              age_verified_at: "2026-01-01T00:00:00.000Z",
              created_at: "2026-01-01T00:00:00.000Z",
              payment_intent_id: "pi_ok",
              pallet_close_charge_idempotency_key: null,
            },
            error: null,
          }),
      };
    },
  }),
}));

import { chargeReservationAtPalletClose } from "@/lib/checkout/pallet-close/charge";
import type { PalletCloseReservationSnapshot } from "@/lib/checkout/pallet-close/types";
import { buildPalletCloseChargeIdempotencyKey } from "@/lib/checkout/pallet-close/state-machine";

function baseRow(
  overrides: Partial<PalletCloseReservationSnapshot> = {},
): PalletCloseReservationSnapshot {
  return {
    id: "res-1",
    pallet_id: "pal-1",
    payment_status: "pending",
    payment_method_id: "pm_1",
    setup_intent_id: "seti_1",
    payment_intent_id: null,
    status: "placed",
    cancelled_at: null,
    charge_deadline_at: "2026-12-01T00:00:00.000Z",
    pallet_close_state: "charging",
    pallet_close_choice: null,
    pallet_close_choice_sent_at: null,
    pallet_close_choice_reply_by: null,
    pallet_close_extension_count: 0,
    offsession_charge_failed_at: null,
    offsession_pay_by: null,
    payment_method_detached_at: null,
    pallet_close_charge_idempotency_key: null,
    ...overrides,
  };
}

describe("chargeReservationAtPalletClose idempotency", () => {
  beforeEach(() => {
    vi.resetModules();
    updates.length = 0;
    chargeOneSetupIntentReservation.mockReset();
    getOrCreateStripeCustomer.mockReset();
    paymentIntentsCreate.mockReset();
    setupIntentsRetrieve.mockReset();
    getOrCreateStripeCustomer.mockResolvedValue("cus_1");
  });

  it("returns already_paid without charging when payment_status is paid", async () => {
    const result = await chargeReservationAtPalletClose({
      reservation: baseRow({ payment_status: "paid" }),
      palletId: "pal-1",
    });
    expect(result.status).toBe("already_paid");
    expect(chargeOneSetupIntentReservation).not.toHaveBeenCalled();
    expect(paymentIntentsCreate).not.toHaveBeenCalled();
  });

  it("returns already_paid when the same idempotency key is already stored", async () => {
    const key = buildPalletCloseChargeIdempotencyKey({
      reservationId: "res-1",
      chargeDeadlineAt: "2026-12-01T00:00:00.000Z",
    });
    const result = await chargeReservationAtPalletClose({
      reservation: baseRow({ pallet_close_charge_idempotency_key: key }),
      palletId: "pal-1",
    });
    expect(result.status).toBe("already_paid");
    expect(result.idempotencyKey).toBe(key);
    expect(chargeOneSetupIntentReservation).not.toHaveBeenCalled();
  });

  it("charges once and records the stable idempotency key on claim", async () => {
    chargeOneSetupIntentReservation.mockResolvedValue("charged");
    const result = await chargeReservationAtPalletClose({
      reservation: baseRow(),
      palletId: "pal-1",
    });
    expect(result.status).toBe("charged");
    expect(chargeOneSetupIntentReservation).toHaveBeenCalledTimes(1);
    expect(updates[0]?.payload.pallet_close_charge_idempotency_key).toBe(
      "pallet_close_charge:res-1:2026-12-01T00:00:00.000Z",
    );
    expect(updates[0]?.payload.pallet_close_state).toBe("charging");
  });

  it("on helper failure, retries Stripe PI with the same idempotency key", async () => {
    chargeOneSetupIntentReservation.mockResolvedValue("failed");
    setupIntentsRetrieve.mockResolvedValue({
      metadata: { expected_amount_ore: "129000" },
    });
    paymentIntentsCreate.mockResolvedValue({
      id: "pi_retry",
      status: "succeeded",
    });

    const result = await chargeReservationAtPalletClose({
      reservation: baseRow(),
      palletId: "pal-1",
    });

    expect(result.status).toBe("charged");
    expect(paymentIntentsCreate).toHaveBeenCalledTimes(1);
    const [, opts] = paymentIntentsCreate.mock.calls[0];
    expect(opts).toEqual({
      idempotencyKey: "pallet_close_charge:res-1:2026-12-01T00:00:00.000Z",
    });
    const body = paymentIntentsCreate.mock.calls[0][0];
    expect(body.off_session).toBe(true);
    expect(body.confirm).toBe(true);
  });
});
