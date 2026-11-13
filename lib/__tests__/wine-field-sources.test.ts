import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isWineFieldSourceField,
  WINE_FIELD_SOURCE_FIELDS,
} from "@/lib/wine-field-sources";

describe("wine_field_sources allowlist", () => {
  it("uses actual wines column names (grape → grape_varieties)", () => {
    expect([...WINE_FIELD_SOURCE_FIELDS]).toEqual([
      "abv",
      "region",
      "grape_varieties",
      "color",
      "description",
    ]);
    expect(isWineFieldSourceField("grape_varieties")).toBe(true);
    expect(isWineFieldSourceField("grape")).toBe(false);
    expect(isWineFieldSourceField("abv")).toBe(true);
  });

  it("migration 286 declares the same CHECK allowlist + RLS", () => {
    const sql = readFileSync(
      resolve(process.cwd(), "migrations/286_wine_field_sources.sql"),
      "utf8",
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.wine_field_sources/);
    expect(sql).toMatch(/grape_varieties/);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/is_platform_admin\(\)/);
    expect(sql).toMatch(/GRANT ALL ON public\.wine_field_sources TO service_role/);
    expect(sql).toMatch(/REVOKE ALL ON public\.wine_field_sources FROM anon/);
  });

  it("migration 287 extends region CHECK with Corse Provence Savoie Bugey", () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        "migrations/287_wine_regions_corse_provence_savoie_bugey.sql",
      ),
      "utf8",
    );
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS wines_region_allowlist_check/);
    expect(sql).toMatch(/'Corse'/);
    expect(sql).toMatch(/'Provence'/);
    expect(sql).toMatch(/'Savoie'/);
    expect(sql).toMatch(/'Bugey'/);
    expect(sql).toMatch(/'Sud-Ouest'/);
    expect(sql).toMatch(/'Rhône'/);
  });
});
