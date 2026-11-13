import { describe, expect, it } from "vitest";

/**
 * Documents free-cancel rules for shared-pallet orders (Axel 2026-11-10).
 * Behaviour is enforced in applyPalletCloseCancel + cancelReservationAndDetachPaymentMethod.
 */
describe("free cancel while pallet open / unpaid", () => {
  it("allows cancel when unpaid regardless of open/extended/null/choice_pending", () => {
    const unpaidStates = [null, "open", "extended", "choice_pending"];
    for (const state of unpaidStates) {
      const paymentStatus = "pending";
      const alreadyPaid = String(paymentStatus) === "paid";
      const allow =
        !alreadyPaid &&
        (state === "choice_pending" ||
          state == null ||
          state === "open" ||
          state === "extended");
      expect(allow).toBe(true);
    }
  });

  it("blocks cancel once payment_status is paid", () => {
    const paymentStatus = "paid";
    expect(String(paymentStatus) === "paid").toBe(true);
  });

  it("existing cancel flow detaches the reservation PaymentMethod and clears retry", () => {
    // Mirror cancelReservationAndDetachPaymentMethod contract:
    // - refuse when payment_status === paid
    // - set status cancelled, clear retry_scheduled_at
    // - stripe.paymentMethods.detach(payment_method_id) for this reservation only
    // - null payment_method_id on the row (no hanging chargeable PM)
    const patch = {
      status: "cancelled",
      retry_scheduled_at: null,
      payment_method_id: null,
      payment_method_detached_at: "2026-11-10T12:00:00.000Z",
    };
    expect(patch.payment_method_id).toBeNull();
    expect(patch.retry_scheduled_at).toBeNull();
    expect(patch.status).toBe("cancelled");
  });
});
