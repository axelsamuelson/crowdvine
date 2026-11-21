import { describe, expect, it } from "vitest";
import { formatStockholmDisplayDate } from "../stockholm-time";

describe("formatStockholmDisplayDate", () => {
  it("formats YYYY-MM-DD as Swedish short date with month period", () => {
    const out = formatStockholmDisplayDate("2026-08-16");
    expect(out).toBe("16 aug. 2026");
    // Abbreviated months in sv-SE include a trailing period.
    expect(out).toMatch(/\d+\s+aug\.\s+2026/);
    expect(out.includes("aug.")).toBe(true);
  });

  it("keeps the period after abbreviated months (not full short names)", () => {
    expect(formatStockholmDisplayDate("2026-11-04")).toBe("4 nov. 2026");
    expect(formatStockholmDisplayDate("2026-01-01")).toBe("1 jan. 2026");
    expect(formatStockholmDisplayDate("2026-10-01")).toBe("1 okt. 2026");
    expect(formatStockholmDisplayDate("2026-12-31")).toBe("31 dec. 2026");
    for (const key of [
      "2026-01-15",
      "2026-02-15",
      "2026-04-15",
      "2026-08-15",
      "2026-09-15",
      "2026-10-15",
      "2026-11-15",
      "2026-12-15",
    ]) {
      const out = formatStockholmDisplayDate(key);
      expect(out).toMatch(/\d+\s+[a-zåäö]+\.\s+\d{4}/i);
    }
    // Full short names in sv-SE have no trailing period.
    expect(formatStockholmDisplayDate("2026-03-15")).toBe("15 mars 2026");
    expect(formatStockholmDisplayDate("2026-05-15")).toBe("15 maj 2026");
  });

  it("formats ISO instants in Europe/Stockholm", () => {
    // 2026-08-15 22:30 UTC = 16 aug 00:30 Stockholm (CEST)
    expect(formatStockholmDisplayDate("2026-08-15T22:30:00.000Z")).toBe(
      "16 aug. 2026",
    );
  });
});
