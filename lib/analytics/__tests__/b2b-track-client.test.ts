import { beforeEach, describe, expect, it, vi } from "vitest";

const trackEvent = vi.fn();

vi.mock("@/lib/analytics/event-tracker", () => ({
  AnalyticsTracker: {
    trackEvent: (...args: unknown[]) => trackEvent(...args),
  },
}));

import {
  classifyB2bContactCta,
  trackB2bContactClicked,
  trackB2bInquiryStarted,
  trackB2bInquirySubmitted,
} from "@/lib/analytics/b2b-track-client";

describe("b2b-track-client", () => {
  beforeEach(() => {
    trackEvent.mockReset();
    trackEvent.mockResolvedValue(undefined);
  });

  it("classifies contact hrefs", () => {
    expect(classifyB2bContactCta("mailto:a@b.c")).toBe("email");
    expect(classifyB2bContactCta("tel:+461234")).toBe("phone");
    expect(classifyB2bContactCta("https://www.instagram.com/x")).toBe(
      "instagram",
    );
    expect(classifyB2bContactCta("/about")).toBe("link");
  });

  it("tracks contact, inquiry started, and inquiry submitted without throwing", () => {
    trackB2bContactClicked({ cta: "email", page: "/shop" });
    trackB2bInquiryStarted({ page: "/cart", source: "checkout_replacement" });
    trackB2bInquirySubmitted({ page: "/cart", wine_count: 3, est_bottles: 18 });

    expect(trackEvent).toHaveBeenCalledTimes(3);
    expect(trackEvent.mock.calls[0][0]).toMatchObject({
      eventType: "b2b_contact_clicked",
      eventCategory: "b2b",
      metadata: { cta: "email", page: "/shop" },
    });
    expect(trackEvent.mock.calls[1][0]).toMatchObject({
      eventType: "b2b_inquiry_started",
      eventCategory: "b2b",
    });
    expect(trackEvent.mock.calls[2][0]).toMatchObject({
      eventType: "b2b_inquiry_submitted",
      eventCategory: "b2b",
      metadata: expect.objectContaining({ wine_count: 3, est_bottles: 18 }),
    });
  });

  it("swallows tracker failures", () => {
    trackEvent.mockImplementation(() => {
      throw new Error("boom");
    });
    expect(() => trackB2bInquiryStarted()).not.toThrow();
  });
});
