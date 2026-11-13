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

describe("admin nav config (ops approval 648d5e92)", () => {
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

    const cms = adminNavigationGroups.find((g) => g.name === "CMS");
    expect(cms).toBeDefined();
    expect(cms!.items.map((i) => i.name)).toEqual([
      "Site content",
      "Producentlådor",
      "Systembolaget",
      "Images",
    ]);
  });

  it("keeps Swedish top-level Översikt and Logga ut in the sidebar shell", () => {
    expect(adminTopLevelNav.some((i) => i.name === "Översikt")).toBe(true);
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
