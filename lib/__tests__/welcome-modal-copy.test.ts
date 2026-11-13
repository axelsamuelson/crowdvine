import { describe, expect, it } from "vitest";
import {
  WELCOME_MODAL_COPY,
  welcomeModalStep1Body,
  welcomeModalStep2Card2Body,
  welcomeModalStep3Body,
  welcomeModalStepIds,
} from "@/lib/onboarding/welcome-modal-copy";
import { welcomeModalLevelDisplayName } from "@/lib/onboarding/welcome-modal-membership";

describe("welcome modal kort-v2 copy", () => {
  it("has exactly 3 steps", () => {
    expect(welcomeModalStepIds()).toEqual([1, 2, 3]);
  });

  it("keeps step 1 wording from handoff (including grossist)", () => {
    expect(WELCOME_MODAL_COPY.sv.step1.body).toContain("grossist i Languedoc");
    expect(WELCOME_MODAL_COPY.en.step1.body).toContain("wholesalers in Languedoc");
    expect(WELCOME_MODAL_COPY.sv.step1.title).toBe("Välkommen till PACT");
    expect(WELCOME_MODAL_COPY.en.step1.title).toBe("Welcome to PACT");
  });

  it("uses Margaux card 3 producent/grossist wording (sha256 3a51bb47)", () => {
    const sv = WELCOME_MODAL_COPY.sv.step2.cards[2];
    const en = WELCOME_MODAL_COPY.en.step2.cards[2];
    expect(sv.title).toBe("Hela lådor.");
    expect(sv.body).toBe(
      "6 flaskor per producent eller grossist (6, 12, 18 …). Viner från samma producent eller grossist går att blanda.",
    );
    expect(en.title).toBe("Full boxes.");
    expect(en.body).toBe(
      "6 bottles per producer or wholesaler (6, 12, 18 …). Wines from the same producer or wholesaler can be mixed.",
    );
  });

  it("gates direct-delivery appends", () => {
    expect(welcomeModalStep1Body("sv", false)).not.toContain("direktleverans");
    expect(welcomeModalStep1Body("sv", true)).toContain("direktleverans");
    expect(welcomeModalStep2Card2Body("en", true)).toContain(
      "Or choose direct delivery, shipped separately.",
    );
  });

  it("interpolates level name and localizes Brons/Guld", () => {
    expect(welcomeModalStep3Body("sv", "Brons")).toContain("Din nivå är Brons");
    expect(welcomeModalLevelDisplayName("brons", "sv")).toBe("Brons");
    expect(welcomeModalLevelDisplayName("brons", "en")).toBe("Bronze");
    expect(welcomeModalLevelDisplayName("guld", "sv")).toBe("Guld");
    expect(welcomeModalLevelDisplayName("guld", "en")).toBe("Gold");
  });

  it("avoids carrier names in copy", () => {
    const blob = JSON.stringify(WELCOME_MODAL_COPY).toLowerCase();
    expect(blob).not.toContain("ups");
    expect(blob).not.toContain("budbee");
  });
});
