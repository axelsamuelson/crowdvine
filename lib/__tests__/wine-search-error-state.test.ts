import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Hitta vin fetch error UX", () => {
  const src = readFileSync(
    resolve(process.cwd(), "components/wine-search/wine-search-explorer.tsx"),
    "utf8",
  );

  it("shows Swedish error copy and retry, not raw API text or filter-empty on failure", () => {
    expect(src).toMatch(/Kunde inte hämta vinlistorna\. Försök igen\./);
    expect(src).toMatch(/Försök igen/);
    expect(src).toMatch(/console\.error\(\s*["']\[Hitta vin\] fetch failed:/);
    expect(src).toMatch(/setFetchFailed\(true\)/);
    expect(src).toMatch(/fetchFailed \? \(/);
    // Filter-empty copy only when not in fetchFailed branch
    expect(src).toMatch(
      /!loading && !fetchFailed && groupedRows\.length === 0/,
    );
    // Must not render error.message / json.error as visible children
    expect(src).not.toMatch(/\{error\}/);
    expect(src).not.toMatch(/setError\(e instanceof Error \? e\.message/);
  });
});
