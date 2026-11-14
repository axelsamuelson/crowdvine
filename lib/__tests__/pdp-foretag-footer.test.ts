import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("PACT För företag link placement", () => {
  it("is not rendered next to the PDP buy CTA", () => {
    const layout = read("components/product/product-pdp-layout.tsx");
    expect(layout).not.toMatch(/PdpB2BLink/);
    expect(layout).not.toMatch(/ctaAside/);
  });

  it("renders in the PACT footer only (Dirty Wine excluded via isB2B/isDirtywineSite)", () => {
    const footer = read("components/layout/footer.tsx");
    expect(footer).toMatch(/PdpB2BLink/);
    expect(footer).toMatch(/variant=\"footer\"/);
    // Inside the non-Dirty Wine navigation branch.
    expect(footer).toMatch(/isDirtywineSite \?/);
    const link = read("components/product/pdp-b2b-link.tsx");
    expect(link).toMatch(/if \(isB2B \|\| !pathname\) return null/);
    expect(link).toMatch(/label: "För företag"/);
    expect(link).toMatch(/label: "For business"/);
    expect(link).toMatch(/https:\/\/dirtywine\.se/);
    expect(link).toMatch(/whitespace-nowrap/);
  });

  it("logs pdp_section_opened with section=price_breakdown when opened", () => {
    const box = read("components/product/product-price-info-box.tsx");
    expect(box).toMatch(/analyticsSection=\"price_breakdown\"/);
    const collapsible = read(
      "components/product/wine-enrichment-collapsible.tsx",
    );
    expect(collapsible).toMatch(/pdp_section_opened/);
    expect(collapsible).toMatch(/metadata: \{ section: analyticsSection \}/);
    const catalog = read("lib/analytics/tracked-events-catalog.ts");
    expect(catalog).toMatch(/eventType: \"pdp_section_opened\"/);
  });
});
