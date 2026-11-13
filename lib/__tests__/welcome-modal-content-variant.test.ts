import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyNaturalWineCopyVariant,
  contentVariantFromAuthUser,
  isNaturalWineHiddenVariantTag,
} from "@/lib/onboarding/welcome-modal-content-variant";
import { WELCOME_MODAL_COPY } from "@/lib/onboarding/welcome-modal-copy";

describe("welcome modal natural-wine content variant (Axel 12/11)", () => {
  it("recognizes hantverk / hide_natural tags", () => {
    expect(isNaturalWineHiddenVariantTag("hantverk")).toBe(true);
    expect(isNaturalWineHiddenVariantTag("hantverksvin")).toBe(true);
    expect(isNaturalWineHiddenVariantTag("hide_natural_wine")).toBe(true);
    expect(isNaturalWineHiddenVariantTag("other")).toBe(false);
  });

  it("reads content_variant from auth metadata", () => {
    expect(
      contentVariantFromAuthUser({
        app_metadata: { content_variant: "hantverk" },
      }),
    ).toBe("hantverk");
    expect(
      contentVariantFromAuthUser({
        user_metadata: { hide_natural_wine: true },
      }),
    ).toBe("hantverk");
  });

  it("rewrites step 1 subtitle away from naturvin / natural wine", () => {
    const sv = applyNaturalWineCopyVariant(
      WELCOME_MODAL_COPY.sv.step1.subtitle,
      "sv",
      true,
    );
    const en = applyNaturalWineCopyVariant(
      WELCOME_MODAL_COPY.en.step1.subtitle,
      "en",
      true,
    );
    expect(sv.toLowerCase()).not.toContain("naturvin");
    expect(sv).toContain("Hantverksvin");
    expect(en.toLowerCase()).not.toContain("natural wine");
    expect(en.toLowerCase()).toContain("craft wine");
  });

  it("leaves card 3 producent/grossist wording intact (no naturvin to rewrite)", () => {
    const sv = WELCOME_MODAL_COPY.sv.step2.cards[2].body;
    const en = WELCOME_MODAL_COPY.en.step2.cards[2].body;
    expect(sv).toContain("producent eller grossist");
    expect(en).toContain("producer or wholesaler");
    expect(applyNaturalWineCopyVariant(sv, "sv", true)).toBe(sv);
    expect(applyNaturalWineCopyVariant(en, "en", true)).toBe(en);
  });

  it("does not ship cookie/localStorage helpers (tag follows the person)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "lib/onboarding/welcome-modal-content-variant.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/document\.cookie/);
    expect(src).not.toMatch(/localStorage/);
    expect(src).toMatch(/contentVariantFromAuthUser/);
  });

  it("rewrites every naturvin/natural-wine occurrence across welcome copy", () => {
    const walk = (node: unknown, locale: "sv" | "en"): string[] => {
      if (typeof node === "string") {
        return [applyNaturalWineCopyVariant(node, locale, true)];
      }
      if (Array.isArray(node)) {
        return node.flatMap((n) => walk(n, locale));
      }
      if (node && typeof node === "object") {
        return Object.values(node).flatMap((n) => walk(n, locale));
      }
      return [];
    };
    for (const s of walk(WELCOME_MODAL_COPY.sv, "sv")) {
      expect(s.toLowerCase()).not.toContain("naturvin");
    }
    for (const s of walk(WELCOME_MODAL_COPY.en, "en")) {
      expect(s.toLowerCase()).not.toContain("natural wine");
    }
  });
});
