import { describe, expect, it } from "vitest";
import { wineDisplayTitle } from "@/lib/wine-display-title";

describe("wineDisplayTitle", () => {
  it("does not append a vintage the name already ends with", () => {
    expect(wineDisplayTitle("Fantaisie Orange 2024", "2024")).toBe(
      "Fantaisie Orange 2024",
    );
    expect(wineDisplayTitle("Fantaisie Orange 2024", 2024)).toBe(
      "Fantaisie Orange 2024",
    );
    expect(wineDisplayTitle("  Fantaisie Orange 2024  ", "2024")).toBe(
      "Fantaisie Orange 2024",
    );
  });

  it("appends the vintage when the name does not end with it", () => {
    expect(wineDisplayTitle("Premices", "2024")).toBe("Premices 2024");
    expect(wineDisplayTitle("Wine 2024 Reserve", "2024")).toBe(
      "Wine 2024 Reserve 2024",
    );
    expect(wineDisplayTitle("Wine 2024", "2023")).toBe("Wine 2024 2023");
  });

  it("keeps a single side when the other is missing", () => {
    expect(wineDisplayTitle("Premices", null)).toBe("Premices");
    expect(wineDisplayTitle("", "2024")).toBe("2024");
    expect(wineDisplayTitle("2024", "2024")).toBe("2024");
  });
});
