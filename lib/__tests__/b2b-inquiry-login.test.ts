import { describe, expect, it } from "vitest";
import {
  B2B_INQUIRY_GUEST_PATH,
  B2B_INQUIRY_PATH,
  b2bInquiryLoginHref,
  isB2bInquiryGuestMode,
} from "@/lib/b2b/inquiry-login";

describe("b2bInquiryLoginHref", () => {
  it("returns existing log-in with next back to inquiry", () => {
    expect(b2bInquiryLoginHref()).toBe(
      `/log-in?next=${encodeURIComponent(B2B_INQUIRY_PATH)}`,
    );
    expect(b2bInquiryLoginHref()).toContain("next=%2Fb2b%2Finquiry");
  });

  it("exposes guest inquiry path and guest query helper", () => {
    expect(B2B_INQUIRY_GUEST_PATH).toBe("/b2b/inquiry?guest=1");
    expect(isB2bInquiryGuestMode({ get: (k) => (k === "guest" ? "1" : null) })).toBe(
      true,
    );
    expect(isB2bInquiryGuestMode({ get: () => null })).toBe(false);
  });
});
