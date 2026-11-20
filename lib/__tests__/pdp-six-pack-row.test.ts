import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { translate } from "@/lib/i18n/messages";

describe("PDP six-pack rule row (delivery info block)", () => {
  it("keeps exact SV / EN copy (unchanged)", () => {
    expect(translate("sv", "commerce.minSixMix")).toBe(
      "Lådor om 6 flaskor – blanda i samma låda.",
    );
    expect(translate("en", "commerce.minSixMix")).toBe(
      "Boxes of 6 bottles – mix in the same box.",
    );
  });

  it("lives in PalletStatusBar delivery rows with pdp_info tracking", () => {
    const bar = readFileSync(
      resolve(process.cwd(), "components/pdp/pallet-status-bar.tsx"),
      "utf8",
    );
    expect(bar).toMatch(/showSixPackRule/);
    expect(bar).toMatch(/MinSixBottlesHint/);
    expect(bar).toMatch(/trackSurface="pdp_info"/);

    const hint = readFileSync(
      resolve(process.cwd(), "components/commerce/min-six-bottles-hint.tsx"),
      "utf8",
    );
    expect(hint).toMatch(/six_pack_rule_viewed/);
    expect(hint).toMatch(/trackSurface/);
    expect(hint).toMatch(/commerce\.minSixMix/);
  });

  it("is not rendered directly under Köp in product-pdp-layout", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "components/product/product-pdp-layout.tsx"),
      "utf8",
    );
    expect(layout).toMatch(/showSixPackRule=/);
    expect(layout).not.toMatch(/MinSixBottlesHint/);
    expect(layout).toMatch(/PalletStatusBar/);
  });
});
