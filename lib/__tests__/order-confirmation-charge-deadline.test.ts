import { describe, expect, it } from "vitest";
import { buildOrderConfirmationText } from "@/lib/sendgrid-service";
import type { OrderConfirmationData } from "@/lib/sendgrid-service";
import {
  computeSharedPalletChargeDeadlineIso,
  formatSharedPalletChargeDeadline,
} from "@/lib/checkout/shared-pallet-deadline";

const base: OrderConfirmationData = {
  customerEmail: "kund@exempel.se",
  customerName: "Anna",
  orderId: "resv_test",
  orderDate: "9 maj 2026",
  items: [{ name: "Testvin", quantity: 6, price: 936 }],
  subtotal: 936,
  tax: 0,
  shipping: 99,
  total: 1035,
  shippingAddress: {
    name: "Anna",
    street: "Storgatan 1",
    city: "Stockholm",
    postalCode: "111 22",
    country: "SE",
  },
};

describe("order confirmation charge deadline (senast)", () => {
  it("includes senast label in text when chargeDeadlineLabel is set", () => {
    const created = "2026-05-06T12:00:00.000Z";
    const iso = computeSharedPalletChargeDeadlineIso(created)!;
    const label = formatSharedPalletChargeDeadline(iso, "sv")!;
    const text = buildOrderConfirmationText({
      ...base,
      chargeDeadlineAt: iso,
      chargeDeadlineLabel: label,
    });
    expect(text).toMatch(/senast/i);
    expect(text).toContain(label);
    expect(text).toMatch(/Payment timing/i);
  });

  it("omits payment-timing block when no deadline", () => {
    const text = buildOrderConfirmationText(base);
    expect(text).not.toMatch(/Payment timing/i);
    expect(text).not.toMatch(/senast/i);
  });
});
