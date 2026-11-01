import { beforeEach, describe, expect, it, vi } from "vitest";
import { EXIT_DISCOUNT_ERRORS } from "@/lib/exit-discount/messages";

const fromMock = vi.fn();

vi.mock("@/lib/exit-discount/config", async () => {
  const actual = await vi.importActual<typeof import("@/lib/exit-discount/config")>(
    "@/lib/exit-discount/config",
  );
  return {
    ...actual,
    exitDiscountScope: () => "all" as const,
  };
});

describe("applyExitDiscountRules", () => {
  beforeEach(() => {
    vi.resetModules();
    fromMock.mockReset();
  });

  function sbFor(opts: {
    priorCount?: number;
    excludedWineIds?: string[];
  }) {
    fromMock.mockImplementation((table: string) => {
      if (table === "order_reservations") {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({
                count: opts.priorCount ?? 0,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "wine_boxes") {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === "wine_box_items") {
        return {
          select: () => ({
            in: async () => ({
              data: (opts.excludedWineIds ?? []).map((wine_id) => ({ wine_id })),
              error: null,
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });
    return { from: fromMock } as never;
  }

  it("rejects email mismatch, redeemed, points, and member discount", async () => {
    const { applyExitDiscountRules } = await import(
      "@/lib/exit-discount/validate"
    );
    const lead = {
      id: "lead-1",
      email: "a@b.com",
      code: "PACT10-TEST",
      promo_discount_code_id: "promo-1",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      redeemed_at: null as string | null,
    };
    const items = [
      { wine_id: "w1", quantity: 6, unit_price: 100 },
    ];

    const mismatch = await applyExitDiscountRules({
      sb: sbFor({}),
      userId: "u1",
      userEmail: "other@b.com",
      lead,
      promo: { type: "percent", value: 10 },
      items,
    });
    expect(mismatch).toEqual({
      ok: false,
      error: EXIT_DISCOUNT_ERRORS.emailMismatch,
    });

    const redeemed = await applyExitDiscountRules({
      sb: sbFor({}),
      userId: "u1",
      userEmail: "a@b.com",
      lead: { ...lead, redeemed_at: new Date().toISOString() },
      promo: { type: "percent", value: 10 },
      items,
    });
    expect(redeemed).toEqual({
      ok: false,
      error: EXIT_DISCOUNT_ERRORS.alreadyRedeemed,
    });

    const points = await applyExitDiscountRules({
      sb: sbFor({}),
      userId: "u1",
      userEmail: "a@b.com",
      lead,
      promo: { type: "percent", value: 10 },
      items,
      context: { pactPointsRedeem: 100 },
    });
    expect(points).toEqual({
      ok: false,
      error: EXIT_DISCOUNT_ERRORS.stackingPoints,
    });

    const member = await applyExitDiscountRules({
      sb: sbFor({}),
      userId: "u1",
      userEmail: "a@b.com",
      lead,
      promo: { type: "percent", value: 10 },
      items,
      context: {
        cart: {
          id: "c",
          checkoutUrl: "/",
          totalQuantity: 6,
          cost: {
            subtotalAmount: { amount: "600", currencyCode: "SEK" },
            totalAmount: { amount: "600", currencyCode: "SEK" },
            totalTaxAmount: { amount: "0", currencyCode: "SEK" },
          },
          lines: [
            {
              id: "l",
              quantity: 6,
              cost: { totalAmount: { amount: "600", currencyCode: "SEK" } },
              discountLabel: "Privilege 10%",
              merchandise: {
                id: "w1",
                title: "W",
                selectedOptions: [],
                product: {
                  id: "w1",
                  title: "W",
                  handle: "w",
                  description: "",
                  descriptionHtml: "",
                  productType: "wine",
                  categoryId: "",
                  options: [],
                  variants: [],
                  priceRange: {
                    minVariantPrice: { amount: "100", currencyCode: "SEK" },
                    maxVariantPrice: { amount: "100", currencyCode: "SEK" },
                  },
                  featuredImage: {
                    id: "i",
                    url: "",
                    altText: "",
                    width: 1,
                    height: 1,
                  },
                  images: [],
                  seo: { title: "", description: "" },
                  tags: [],
                  availableForSale: true,
                  currencyCode: "SEK",
                  updatedAt: "",
                  createdAt: "",
                  hasDiscount: true,
                },
              },
            },
          ],
        },
      },
    });
    expect(member).toEqual({
      ok: false,
      error: EXIT_DISCOUNT_ERRORS.stackingMemberOrEarlyBird,
    });
  });

  it("computes 10% on wine lines only (no shipping) and ignores excluded wines", async () => {
    const { applyExitDiscountRules } = await import(
      "@/lib/exit-discount/validate"
    );
    // Force exclusions via env box id path: mock wine_boxes returning a box,
    // and wine_box_items returning meigoon wine.
    fromMock.mockImplementation((table: string) => {
      if (table === "order_reservations") {
        return {
          select: () => ({
            eq: () => ({
              or: async () => ({ count: 0, error: null }),
            }),
          }),
        };
      }
      if (table === "wine_boxes") {
        return {
          select: () => ({
            eq: async () => ({
              data: [{ id: "47e52b51-d649-40c2-a0f2-0b1067886c56" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "wine_box_items") {
        return {
          select: () => ({
            in: async () => ({
              data: [{ wine_id: "meigoon-wine" }],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const result = await applyExitDiscountRules({
      sb: { from: fromMock } as never,
      userId: "u1",
      userEmail: "a@b.com",
      lead: {
        id: "lead-1",
        email: "a@b.com",
        code: "PACT10-X",
        promo_discount_code_id: "promo-1",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        redeemed_at: null,
      },
      promo: { type: "percent", value: 10 },
      items: [
        { wine_id: "meigoon-wine", quantity: 3, unit_price: 160 },
        { wine_id: "other", quantity: 6, unit_price: 100 },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // 10% of 600 SEK wine (not meigoon, not shipping)
      expect(result.cartValueSek).toBe(600);
      expect(result.discountAmountSek).toBe(60);
    }
  });
});
