import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculatePromoDiscountAmountSek } from "@/lib/discount-codes";
import {
  PACT_POINTS_CONVERSION_DESCRIPTION,
  isPactPointsConversionCoupon,
} from "@/lib/membership/pact-points-conversion";

const getCurrentUser = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdmin: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

describe("PACT points conversion coupon", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    fromMock.mockReset();
  });

  it("caps conversion promo at min(value, 50% of wine)", () => {
    const items = [
      { wine_id: "w1", quantity: 6, unit_price: 107 },
    ];
    // wine = 642 → 50% = 321
    expect(
      calculatePromoDiscountAmountSek({
        type: "sek",
        value: 400,
        applies_to: "order",
        cart_value_sek: 741,
        items,
        description: PACT_POINTS_CONVERSION_DESCRIPTION,
      }),
    ).toBe(321);

    expect(
      calculatePromoDiscountAmountSek({
        type: "sek",
        value: 200,
        applies_to: "order",
        cart_value_sek: 741,
        items,
        description: PACT_POINTS_CONVERSION_DESCRIPTION,
      }),
    ).toBe(200);

    // Non-conversion: no 50% wine cap (only cart min)
    expect(
      calculatePromoDiscountAmountSek({
        type: "sek",
        value: 400,
        applies_to: "order",
        cart_value_sek: 741,
        items,
        description: "other",
      }),
    ).toBe(400);
  });

  it("GET /api/user/coupons requires auth", async () => {
    getCurrentUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/user/coupons/route");
    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("GET /api/user/coupons returns [] when promo table is missing", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });
    fromMock.mockImplementation((table: string) => {
      if (table === "promo_discount_codes") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gt: () => ({
                  order: () =>
                    Promise.resolve({
                      data: null,
                      error: {
                        code: "42P01",
                        message: 'relation "promo_discount_codes" does not exist',
                      },
                    }),
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });
    const { GET } = await import("@/app/api/user/coupons/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coupons).toEqual([]);
  });

  it("GET /api/user/coupons returns only own active unused rows", async () => {
    getCurrentUser.mockResolvedValue({ id: "user-1", email: "u@example.com" });

    function thenable<T>(value: T) {
      return {
        then: (resolve: (v: T) => unknown) => Promise.resolve(value).then(resolve),
        eq: () => thenable(value),
        gt: () => thenable(value),
        order: () => thenable(value),
      };
    }

    fromMock.mockImplementation((table: string) => {
      if (table === "promo_discount_codes") {
        return {
          select: () =>
            thenable({
              data: [
                {
                  id: "c1",
                  code: "pact150",
                  type: "sek",
                  value: 150,
                  description: PACT_POINTS_CONVERSION_DESCRIPTION,
                  valid_until: "2027-01-01T00:00:00.000Z",
                  max_uses: 1,
                  max_uses_per_user: 1,
                },
              ],
              error: null,
            }),
        };
      }
      if (table === "promo_discount_code_uses") {
        return {
          select: () => thenable({ count: 0, error: null }),
        };
      }
      return {};
    });

    const { GET } = await import("@/app/api/user/coupons/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.coupons).toHaveLength(1);
    expect(body.coupons[0].code).toBe("PACT150");
    expect(body.coupons[0].value_sek).toBe(150);
    expect(isPactPointsConversionCoupon(body.coupons[0].description)).toBe(
      true,
    );
  });

  it("wires profile card + checkout one-click offer + conversion copy keys", () => {
    const profilePage = readFileSync(
      resolve(process.cwd(), "app/profile/page.tsx"),
      "utf8",
    );
    const card = readFileSync(
      resolve(process.cwd(), "components/profile/pact-conversion-coupon-card.tsx"),
      "utf8",
    );
    const checkout = readFileSync(
      resolve(process.cwd(), "app/checkout/checkout-client.tsx"),
      "utf8",
    );
    const validate = readFileSync(
      resolve(process.cwd(), "lib/promo-discount-validate.ts"),
      "utf8",
    );
    const sv = readFileSync(resolve(process.cwd(), "messages/sv.json"), "utf8");
    const en = readFileSync(resolve(process.cwd(), "messages/en.json"), "utf8");

    expect(profilePage).toMatch(/ProfilePactConversionCouponCard/);
    expect(card).toMatch(/pactPointsReplacedByCoupon/);
    expect(card).toMatch(/\/api\/user\/coupons/);
    expect(checkout).toMatch(/checkout-account-coupons/);
    expect(checkout).toMatch(/applyDiscountCode\(c\.code\)/);
    expect(validate).toMatch(/description/);
    expect(sv).toMatch(
      /Dina PACT-poäng har bytts mot en kupong på \{belopp\}/,
    );
    expect(en).toMatch(
      /Your PACT points have been exchanged for a coupon worth \{belopp\}/,
    );
    expect(checkout).toMatch(/haveDiscountCode/);
    expect(sv).toMatch(/Har du en rabattkod\?/);
    expect(en).toMatch(/Have a discount code\?/);
  });
});
