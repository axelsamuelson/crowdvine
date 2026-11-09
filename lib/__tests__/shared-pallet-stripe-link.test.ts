import { describe, expect, it } from "vitest";
import {
  SHARED_PALLET_STRIPE_LINK_ENABLED,
  sharedPalletLinkEnabled,
  sharedPalletPaymentElementOptions,
} from "@/lib/checkout/shared-pallet-stripe-link";

describe("shared-pallet Stripe Link constant", () => {
  it("defaults Link OFF for phase 1", () => {
    expect(SHARED_PALLET_STRIPE_LINK_ENABLED).toBe(false);
    expect(sharedPalletLinkEnabled()).toBe(false);
  });

  it("Payment Element options never wallets + Link never when off", () => {
    const opts = sharedPalletPaymentElementOptions();
    expect(opts.paymentMethodOrder).toEqual(["card"]);
    expect(opts.wallets.applePay).toBe("never");
    expect(opts.wallets.googlePay).toBe("never");
    expect(opts.wallets.link).toBe("never");
  });

  it("can enable Link wallet when overridden", () => {
    const opts = sharedPalletPaymentElementOptions({ linkEnabled: true });
    expect(opts.wallets.link).toBe("auto");
    expect(opts.paymentMethodOrder).toEqual(["card"]);
  });
});
