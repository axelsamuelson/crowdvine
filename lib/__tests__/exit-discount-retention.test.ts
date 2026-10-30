import { describe, expect, it, vi } from "vitest";
import { runExitDiscountRetention } from "@/lib/exit-discount/retention";

describe("runExitDiscountRetention", () => {
  it("deletes unused leads and deactivates promos", async () => {
    const update = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null, count: 1 }),
    });
    const del = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null, count: 1 }),
    });
    const select = vi.fn().mockReturnValue({
      is: vi.fn().mockReturnValue({
        lt: vi.fn().mockResolvedValue({
          data: [{ id: "lead-1", promo_discount_code_id: "promo-1" }],
          error: null,
        }),
      }),
    });

    const sb = {
      from: (table: string) => {
        if (table === "exit_discount_codes") {
          return { select, delete: del };
        }
        if (table === "promo_discount_codes") {
          return { update };
        }
        throw new Error(table);
      },
    };

    const summary = await runExitDiscountRetention(sb as never, new Date("2026-10-30"));
    expect(summary.deletedLeads).toBe(1);
    expect(summary.deactivatedPromos).toBe(1);
    expect(summary.retentionMonths).toBe(12);
  });
});
