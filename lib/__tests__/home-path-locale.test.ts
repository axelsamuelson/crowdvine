import { describe, expect, it } from "vitest";

import { homePathForLocale } from "@/lib/i18n/localized-routes";
import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";

describe("homepage language pair", () => {
  it("maps locale to / and /en", () => {
    expect(homePathForLocale("sv")).toBe("/");
    expect(homePathForLocale("en")).toBe("/en");
    expect(localizedPathsForLocale("en").home).toBe("/en");
    expect(localizedPathsForLocale("sv").home).toBe("/");
  });
});
