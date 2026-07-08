import { describe, expect, it } from "vitest";
import {
  parseAllSwlUpdatedAtStrings,
  parseMaxSwlUpdatedAtFromHtml,
  parseSwlUpdatedAt,
} from "../starwinelist-scraper";
import {
  normalizeVenueName,
  parseStockholmWidgetUpdates,
} from "../stockholm-widget";

describe("parseMaxSwlUpdatedAtFromHtml", () => {
  it("returns the newest of multiple Updated dates", () => {
    const html = `
      <p>Brasserie Elverket BTG Updated 17 June 2026</p>
      <p>Brasserie Elverket Källarlista Updated 06 June 2026</p>
    `;
    const { swl_updated_at, swl_updated_at_parsed } =
      parseMaxSwlUpdatedAtFromHtml(html);
    expect(swl_updated_at).toBe("Updated 17 June 2026");
    expect(swl_updated_at_parsed?.getMonth()).toBe(5);
    expect(swl_updated_at_parsed?.getDate()).toBe(17);
  });

  it("parseAllSwlUpdatedAtStrings dedupes", () => {
    const html =
      "Updated 01 Jan 2026 and Updated 01 Jan 2026 and Updated 02 Feb 2026";
    expect(parseAllSwlUpdatedAtStrings(html)).toEqual([
      "Updated 01 Jan 2026",
      "Updated 02 Feb 2026",
    ]);
  });
});

describe("parseSwlUpdatedAt", () => {
  it("parses Swedish month names", () => {
    const d = parseSwlUpdatedAt("Updated 05 mars 2026");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
  });
});

describe("parseStockholmWidgetUpdates", () => {
  it("parses concatenated NameUpdated date entries", () => {
    const html = `
      <h3>Newest Wine List Updates</h3>
      <ul>
        <li>Brasserie AstoriaUpdated 02 July 2026</li>
        <li>Brasserie MaisonUpdated 02 July 2026</li>
        <li>Savant BarUpdated 01 June 2026</li>
      </ul>
    `;
    const result = parseStockholmWidgetUpdates(html);
    expect(result.widget_found).toBe(true);
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]?.display_name).toBe("Brasserie Astoria");
    expect(result.entries[0]?.updated_raw).toBe("Updated 02 July 2026");
  });

  it("returns empty when widget marker missing", () => {
    const result = parseStockholmWidgetUpdates("<html><body>no widget</body></html>");
    expect(result.widget_found).toBe(false);
    expect(result.entries).toHaveLength(0);
  });
});

describe("normalizeVenueName", () => {
  it("lowercases, strips diacritics, collapses whitespace", () => {
    expect(normalizeVenueName("  Café   Nizza  ")).toBe("cafe nizza");
    expect(normalizeVenueName("Sturehof")).toBe("sturehof");
  });
});
