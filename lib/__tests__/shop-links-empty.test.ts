import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("ShopLinks empty list", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/layout/shop-links.tsx"),
    "utf8",
  );
  const menuSrc = readFileSync(
    resolve(process.cwd(), "components/layout/header/mobile-menu.tsx"),
    "utf8",
  );
  const sidebarSrc = readFileSync(
    resolve(process.cwd(), "components/layout/sidebar/home-sidebar.tsx"),
    "utf8",
  );

  it("hides the whole section when there are no producers (no debug empty copy)", () => {
    expect(src).toMatch(/if \(filteredCollections\.length === 0\) \{\s*return null;/);
    expect(src).not.toMatch(/\{filteredCollections\.length === 0 && emptyMessage/);
    expect(src).not.toMatch(/Debug info/);
  });

  it("call sites no longer pass noProducersFound emptyMessage", () => {
    expect(menuSrc).not.toMatch(/noProducersFound/);
    expect(menuSrc).not.toMatch(/emptyMessage=/);
    expect(sidebarSrc).not.toMatch(/noProducersFound/);
    expect(sidebarSrc).not.toMatch(/emptyMessage=/);
  });
});
