import { describe, expect, it } from "vitest";
import { translate } from "@/lib/i18n/messages";
import { formatWineColorLabel } from "@/lib/i18n/wine-color-labels";

describe("formatWineColorLabel", () => {
  it("translates white/red/orange/rosé/sparkling with PLP keys", () => {
    const tSv = (key: string) => translate("sv", key);
    const tEn = (key: string) => translate("en", key);
    expect(formatWineColorLabel(tSv, "white")).toBe("Vitt");
    expect(formatWineColorLabel(tEn, "white")).toBe("White");
    expect(formatWineColorLabel(tSv, "red")).toBe("Rött");
    expect(formatWineColorLabel(tSv, "orange")).toBe("Orange");
    expect(formatWineColorLabel(tSv, "rosé")).toBe("Rosé");
    expect(formatWineColorLabel(tSv, "sparkling")).toBe("Mousserande");
    expect(formatWineColorLabel(tEn, "sparkling")).toBe("Sparkling");
  });
});
