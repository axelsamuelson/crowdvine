import { describe, expect, it } from "vitest";
import {
  B2B_INQUIRY_PATH,
  b2bInquiryLoginHref,
} from "@/lib/b2b/inquiry-login";

describe("b2bInquiryLoginHref", () => {
  it("returns existing log-in with next back to inquiry", () => {
    expect(b2bInquiryLoginHref()).toBe(
      `/log-in?next=${encodeURIComponent(B2B_INQUIRY_PATH)}`,
    );
    expect(b2bInquiryLoginHref()).toContain("next=%2Fb2b%2Finquiry");
  });
});
