import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("admin step 1 dead routes / UI cleanup (f297c243)", () => {
  it("redirects /admin/orders/[id] to /admin/b2c-orders/[id]", () => {
    const src = read("app/admin/orders/[id]/page.tsx");
    expect(src).toMatch(/permanentRedirect/);
    expect(src).toMatch(/\/admin\/b2c-orders\/\$\{id\}|`\/admin\/b2c-orders\/\$\{id\}`/);
  });

  it("sends /admin/unauthorized to /admin-auth/login with no /admin/login link in app code", () => {
    const unauthorized = read("app/admin/unauthorized/page.tsx");
    expect(unauthorized).toMatch(/permanentRedirect\(\s*["']\/admin-auth\/login["']\s*\)/);
    expect(unauthorized).not.toMatch(/\/admin\/login/);

    const appTs = [
      "app/admin/unauthorized/page.tsx",
      "app/admin/orders/[id]/page.tsx",
      "components/admin/admin-nav-config.ts",
      "components/admin/sidebar.tsx",
    ];
    for (const path of appTs) {
      expect(read(path)).not.toMatch(/href=["']\/admin\/login["']/);
    }
  });

  it("hides wine-tastings/new buttons (route may still be missing)", () => {
    const src = read("app/admin/wine-tastings/page.tsx");
    expect(src).not.toMatch(/\/admin\/wine-tastings\/new/);
    expect(existsSync(resolve(process.cwd(), "app/admin/wine-tastings/new"))).toBe(
      false,
    );
  });

  it("removes dead Export and ⋮ controls from B2C order list header", () => {
    const src = read("app/admin/b2c-orders/page.tsx");
    expect(src).not.toMatch(/\bExport\b/);
    expect(src).not.toMatch(/MoreHorizontal/);
    expect(src).not.toMatch(/\bDownload\b/);
  });

  it("adds noindex robots metadata on /concept-N pages", () => {
    for (let n = 1; n <= 13; n++) {
      const src = read(`app/concept-${n}/page.tsx`);
      expect(src).toMatch(/NOINDEX_PAGE_ROBOTS|robots:\s*\{\s*index:\s*false/);
    }
  });

  it("menu extraction upload dialog uses input type=file", () => {
    const src = read("app/admin/menu-extraction/page.tsx");
    expect(src).toMatch(/type=["']file["']/);
    expect(src).toMatch(/FormData/);
    expect(src).toMatch(/\/api\/admin\/menu-extraction\/documents/);
  });
});
