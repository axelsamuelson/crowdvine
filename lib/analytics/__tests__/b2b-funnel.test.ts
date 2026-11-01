import { describe, expect, it } from "vitest";
import {
  B2B_FUNNEL_CONVERSION_EVENT,
  B2B_FUNNEL_SINCE,
  buildB2bWeeklyFunnel,
} from "@/lib/analytics/b2b-funnel";

describe("buildB2bWeeklyFunnel", () => {
  it("starts at the reliable analytics cutoff week", () => {
    const rows = buildB2bWeeklyFunnel([], new Date("2026-10-31T12:00:00.000Z"));
    expect(rows[0]?.week_start).toBe(
      // Monday of week containing 2026-08-07 (Friday) → 2026-08-03
      "2026-08-03",
    );
    expect(B2B_FUNNEL_SINCE).toBe("2026-08-07");
    expect(B2B_FUNNEL_CONVERSION_EVENT).toBe("b2b_inquiry_submitted");
  });

  it("orders inquiry_started before inquiry_submitted and derives repeat orders", () => {
    const rows = buildB2bWeeklyFunnel(
      [
        {
          event_type: "b2b_contact_clicked",
          created_at: "2026-09-10T10:00:00.000Z",
          event_metadata: { cta: "email" },
          page_url: "https://dirtywine.se/shop",
        },
        {
          event_type: "b2b_inquiry_started",
          created_at: "2026-09-10T11:00:00.000Z",
          event_metadata: { page: "/cart" },
          page_url: "https://dirtywine.se/cart",
        },
        {
          event_type: "b2b_inquiry_submitted",
          created_at: "2026-09-10T12:00:00.000Z",
          event_metadata: { wine_count: 2 },
          page_url: "https://dirtywine.se/cart",
        },
        {
          event_type: "b2b_tasting_requested",
          created_at: "2026-09-11T10:00:00.000Z",
          event_metadata: { wines: ["w1"] },
          page_url: "https://dirtywine.se/",
        },
        {
          event_type: "b2b_order_created",
          created_at: "2026-09-12T10:00:00.000Z",
          event_metadata: { is_first_order: true, order_type: "offline" },
          page_url: "https://dirtywine.se/",
        },
        {
          event_type: "b2b_order_created",
          created_at: "2026-09-13T10:00:00.000Z",
          event_metadata: { is_first_order: false, order_type: "offline" },
          page_url: "https://dirtywine.se/",
        },
      ],
      new Date("2026-09-14T12:00:00.000Z"),
    );

    // 2026-09-10 is Thursday → Stockholm week start Monday 2026-09-07
    const week = rows.find((r) => r.week_start === "2026-09-07");
    expect(week).toEqual({
      week_start: "2026-09-07",
      contact_clicked: 1,
      inquiry_started: 1,
      inquiry_submitted: 1,
      tasting_or_quote: 1,
      first_orders: 1,
      repeat_orders: 1,
    });
  });

  it("ignores events before the cutoff", () => {
    const rows = buildB2bWeeklyFunnel(
      [
        {
          event_type: "b2b_contact_clicked",
          created_at: "2026-08-01T10:00:00.000Z",
          event_metadata: {},
          page_url: "https://dirtywine.se/",
        },
      ],
      new Date("2026-08-10T12:00:00.000Z"),
    );
    expect(rows.every((r) => r.contact_clicked === 0)).toBe(true);
  });
});
