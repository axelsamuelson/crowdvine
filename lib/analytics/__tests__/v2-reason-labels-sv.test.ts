import { describe, expect, it } from "vitest";
import {
  ABANDON_REASON_LABELS_SV_V2,
  CHECKOUT_BLOCK_REASON_LABELS_SV,
  SHIPPING_PREVIEW_REASON_LABELS_SV,
  SHIPPING_QUOTE_REASON_LABELS_SV,
  ADD_TO_CART_FAILED_REASON_LABELS_SV,
  AGE_CONFIRMATION_FAILED_REASON_LABELS_SV,
  checkoutBlockReasonLabelSv,
  shippingPreviewReasonLabelSv,
  abandonReasonLabelSvV2,
  addToCartFailedReasonLabelSv,
  ageConfirmationFailedReasonLabelSv,
} from "@/lib/analytics/v2/reason-labels-sv";

describe("reason-labels-sv (bilaga C)", () => {
  it("covers all 17 checkout_step_blocked reasons", () => {
    const expected = [
      "missing_name",
      "missing_email",
      "invalid_email",
      "missing_phone",
      "address_not_persisted",
      "zone_required",
      "pallet_required",
      "delivery_not_selected",
      "direct_box_carrier_unconfigured",
      "quote_loading",
      "quote_error",
      "quote_missing",
      "quote_channel_mismatch",
      "direct_box_shipping_pending",
      "direct_box_shipping_unquoted",
      "direct_box_pact_rate_forbidden",
      "purchase_disabled",
    ];
    for (const code of expected) {
      expect(CHECKOUT_BLOCK_REASON_LABELS_SV[code]).toBeTruthy();
      expect(checkoutBlockReasonLabelSv(code)).not.toBe("Okänd orsak");
    }
    expect(Object.keys(CHECKOUT_BLOCK_REASON_LABELS_SV)).toHaveLength(17);
  });

  it("matches bilaga C texts for key codes", () => {
    expect(checkoutBlockReasonLabelSv("missing_phone")).toBe(
      "Telefonnummer saknas",
    );
    expect(SHIPPING_QUOTE_REASON_LABELS_SV.auth_required).toBe(
      "Inte inloggad när frakten beräknades",
    );
    expect(shippingPreviewReasonLabelSv("rate_missing")).toBe(
      "Fraktpris saknas för marknaden",
    );
    expect(ADD_TO_CART_FAILED_REASON_LABELS_SV.empty_cart).toBe(
      "Varukorgen var tom efter försöket",
    );
    expect(ABANDON_REASON_LABELS_SV_V2.validation_error).toBe(
      "Felaktiga uppgifter",
    );
    expect(abandonReasonLabelSvV2("login_wall")).toBe("Stoppades av inloggning");
  });

  it("never falls for unknown codes", () => {
    expect(checkoutBlockReasonLabelSv("totally_new_code")).toBe("Okänd orsak");
    expect(addToCartFailedReasonLabelSv(null)).toBe("Okänd orsak");
    expect(Object.keys(SHIPPING_PREVIEW_REASON_LABELS_SV).sort()).toEqual(
      [
        "invalid_request",
        "preview_error",
        "preview_timeout",
        "rate_missing",
        "unknown",
      ].sort(),
    );
  });

  it("maps age_confirmation_failed.code (bilaga C.6)", () => {
    expect(AGE_CONFIRMATION_FAILED_REASON_LABELS_SV.age_under_minimum).toBe(
      "Under åldersgränsen",
    );
    expect(ageConfirmationFailedReasonLabelSv("age_under_minimum")).toBe(
      "Under åldersgränsen",
    );
    expect(ageConfirmationFailedReasonLabelSv(null)).toBe("Okänd orsak");
    expect(ageConfirmationFailedReasonLabelSv("totally_new_code")).toBe(
      "Okänd orsak",
    );
  });
});
