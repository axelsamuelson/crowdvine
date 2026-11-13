import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function read(rel: string) {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

describe("retired /onboarding Opus template", () => {
  it("permanently redirects /onboarding to / from the App Router page", () => {
    const src = read("app/onboarding/page.tsx");
    expect(src).toMatch(/permanentRedirect/);
    expect(src).toMatch(/permanentRedirect\(\s*["']\/["']\s*\)/);
    expect(src).not.toMatch(/PricingSection|HeroSection|opus/);
  });

  it("declares permanent next.config redirects for /onboarding and /en/onboarding", () => {
    const src = read("next.config.mjs");
    expect(src).toMatch(/source:\s*["']\/onboarding["']/);
    expect(src).toMatch(/source:\s*["']\/en\/onboarding["']/);
    // Both destinations must be home; permanent: true → 308
    const onboardingBlocks = src.match(
      /\{\s*source:\s*["']\/(?:en\/)?onboarding["'][\s\S]*?\}/g,
    );
    expect(onboardingBlocks?.length).toBeGreaterThanOrEqual(2);
    for (const block of onboardingBlocks ?? []) {
      expect(block).toMatch(/destination:\s*["']\/["']/);
      expect(block).toMatch(/permanent:\s*true/);
    }
  });

  it("does not link to /onboarding from footer or OnboardingButton", () => {
    expect(read("components/layout/footer.tsx")).not.toMatch(/onboarding/i);
    expect(
      existsSync(resolve(process.cwd(), "components/layout/onboarding-button.tsx")),
    ).toBe(false);
  });

  it("never pushes /onboarding from OnboardingProvider.showWelcome", () => {
    const src = read("components/onboarding/onboarding-provider.tsx");
    expect(src).not.toMatch(/push\s*\(\s*["']\/onboarding["']/);
    expect(src).not.toMatch(/router\.push/);
    expect(src).toMatch(/no-op/i);
  });
});
