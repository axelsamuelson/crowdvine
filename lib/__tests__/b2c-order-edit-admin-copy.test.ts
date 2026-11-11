import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("B2C order edit admin copy (Inès)", () => {
  it('customer link is "Visa kund" without a trailing arrow', () => {
    const source = readRepoFile(
      "components/admin/reservation-edit-form.tsx",
    );
    expect(source).toContain("Visa kund");
    expect(source).not.toContain("View customer");
    expect(source).not.toMatch(/Visa kund\s*→/);
  });

  it("page has a single Order title (no B2C Order / Update reservation details heading)", () => {
    const page = readRepoFile("app/admin/b2c-orders/[id]/page.tsx");
    expect(page).not.toContain("B2C Order");
    expect(page).not.toContain("Update reservation details");
    expect(page).toContain("afterHeader");

    const form = readRepoFile("components/admin/reservation-edit-form.tsx");
    expect(form).toContain("Order #{reservationIdShort}");
    expect(form).not.toContain("B2C Order");
    expect(form).not.toContain("Update reservation details and items");
  });

  it('direct-box panel subtitle is "Status och leveransdatum"', () => {
    const panel = readRepoFile(
      "components/admin/direct-box-fulfillment-panel.tsx",
    );
    expect(panel).toContain("Status och leveransdatum");
    expect(panel).not.toContain("Status, spårning och plocklista");
  });
});
