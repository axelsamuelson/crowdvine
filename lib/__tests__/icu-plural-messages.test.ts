import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/messages";
import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-disallow";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("ICU plural in translate()", () => {
  it("renders Swedish wine singular/plural", () => {
    expect(translate("sv", "profile.winesCount", { count: 1 })).toBe("1 vin");
    expect(translate("sv", "profile.winesCount", { count: 2 })).toBe("2 viner");
  });

  it("renders English wine singular/plural", () => {
    expect(translate("en", "profile.winesCount", { count: 1 })).toBe("1 wine");
    expect(translate("en", "profile.winesCount", { count: 6 })).toBe("6 wines");
  });
});

describe("robots disallow EN profile/checkout", () => {
  it("disallows /en/profile and /en/checkout alongside SV paths", () => {
    expect(ROBOTS_DISALLOW_PATHS).toContain("/profile");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/en/profile");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/checkout");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/en/checkout");
  });

  it("profile layout exports noindex robots metadata", () => {
    const src = readFileSync(
      resolve(process.cwd(), "app/profile/layout.tsx"),
      "utf8",
    );
    expect(src).toMatch(/privatePageMetadata/);
  });
});
