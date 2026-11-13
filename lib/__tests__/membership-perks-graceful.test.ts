import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("membership perks lookup fail-soft", () => {
  const src = readFileSync(
    resolve(process.cwd(), "app/api/user/membership/route.ts"),
    "utf8",
  );

  it("returns empty perks on membership_perks error instead of throwing 500", () => {
    expect(src).toMatch(/membership_perks lookup failed/);
    expect(src).toMatch(/safePerks/);
    expect(src).toMatch(/perksError \? \[\]/);
    // Must not throw on perksError anymore.
    expect(src).not.toMatch(/if \(perksError\) throw perksError/);
  });

  it("uses maybeSingle so a missing membership row is 404 not 500", () => {
    expect(src).toMatch(/\.maybeSingle\(\)/);
    expect(src).toMatch(/Membership not found/);
    expect(src).toMatch(/status: 404/);
  });
});
