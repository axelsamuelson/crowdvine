import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  adminNavigationGroups,
  adminTopLevelNav,
  getAdminNavItems,
} from "@/components/admin/admin-nav-config";

/** Removed per ops_approval_queue 648d5e92 (Axel: Använder ingen – ta bort ur menyn). */
const REMOVED_HREFS = [
  "/admin/operations",
  "/admin/strategy-map",
  "/admin/home-concepts",
] as const;

const REMOVED_NAMES = ["Strategy map", "Home concepts", "Strategikarta"] as const;

describe("admin nav config (ops approval 648d5e92 / f297c243 step 1)", () => {
  const items = getAdminNavItems();
  const hrefs = items.map((i) => i.href);
  const names = items.map((i) => i.name);

  it("does not include Operations overview / strategy map or Home concepts", () => {
    for (const href of REMOVED_HREFS) {
      expect(hrefs).not.toContain(href);
    }
    for (const name of REMOVED_NAMES) {
      expect(names).not.toContain(name);
    }
  });

  it("does not add bulk-upload or bookings as menu items", () => {
    expect(hrefs).not.toContain("/admin/bulk-upload");
    expect(hrefs).not.toContain("/admin/bookings");
    expect(names).not.toContain("Bookings");
    expect(names).not.toContain("Bokningar-lista");
  });

  it("keeps Menyextraktion, Hitta vin, and Business in PACT admin menu", () => {
    expect(hrefs).toContain("/admin/menu-extraction");
    expect(hrefs).toContain("/admin/wine-search");
    expect(hrefs).toContain("/admin/users/business");
    expect(names).toContain("Menyextraktion");
    expect(names).toContain("Hitta vin");
    expect(names).toContain("Business");
  });

  it("keeps Operations and CMS groups non-empty (no empty headings)", () => {
    for (const group of adminNavigationGroups) {
      expect(group.items.length).toBeGreaterThan(0);
    }
    const ops = adminNavigationGroups.find((g) => g.name === "Operations");
    expect(ops).toBeDefined();
    expect(ops!.items.map((i) => i.href)).toEqual([
      "/admin/operations/goals",
      "/admin/operations/objectives",
      "/admin/operations/projects",
      "/admin/operations/tasks",
      "/admin/operations/my-work",
    ]);
    expect(ops!.items.map((i) => i.name)).toEqual([
      "Mål",
      "Objectives",
      "Projekt",
      "Uppgifter",
      "Min arbetsyta",
    ]);

    const cms = adminNavigationGroups.find((g) => g.name === "CMS");
    expect(cms).toBeDefined();
    expect(cms!.items.map((i) => i.name)).toEqual([
      "Sajtinnehåll",
      "Producentlådor",
      "Systembolaget",
      "Bilder",
    ]);
  });

  it("uses Swedish labels for stayed pages (Business stays English)", () => {
    expect(adminTopLevelNav.map((i) => i.name)).toEqual(["Översikt", "Analys"]);
    expect(names).toContain("Användare");
    expect(names).toContain("Producenter");
    expect(names).toContain("Vinprovningar");
    expect(names).toContain("Konkurrentpriser");
    expect(names).toContain("Fulfillment-kostnader");
    expect(names).toContain("Medlemskap");
    expect(names).toContain("Åtkomstkontroll");
    expect(names).not.toContain("Users");
    expect(names).not.toContain("Wine Tastings");
    expect(names).not.toContain("Access Control");
    expect(names).not.toContain("Fulfillment costs");
  });

  it("keeps Swedish Logga ut in the sidebar shell and no removed hrefs inline", () => {
    const sidebarSrc = readFileSync(
      resolve(process.cwd(), "components/admin/sidebar.tsx"),
      "utf8",
    );
    expect(sidebarSrc).toMatch(/Logga ut/);
    expect(sidebarSrc).toMatch(/admin-nav-config/);
    expect(sidebarSrc).not.toMatch(/Home concepts/);
    expect(sidebarSrc).not.toMatch(/Strategy map/);
    expect(sidebarSrc).not.toMatch(/href:\s*["']\/admin\/operations["']/);
    expect(sidebarSrc).not.toMatch(/href:\s*["']\/admin\/strategy-map["']/);
    expect(sidebarSrc).not.toMatch(/href:\s*["']\/admin\/home-concepts["']/);
  });

  it("has no duplicate hrefs in the menu", () => {
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
