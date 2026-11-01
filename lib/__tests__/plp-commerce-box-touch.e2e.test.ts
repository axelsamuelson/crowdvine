/**
 * E2E: PLP commerce-box first-tap reveal on a real touch-emulated iPhone viewport.
 * Uses playwright-core + @sparticuz/chromium (CI-safe) with hasTouch / isMobile.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser, type Page } from "playwright-core";

const FIXTURE = pathToFileURL(
  path.resolve(__dirname, "fixtures/plp-commerce-box-touch.html"),
).href;

async function launchBrowser(): Promise<Browser> {
  const sparticuz = (await import("@sparticuz/chromium")).default;
  const executablePath = await sparticuz.executablePath();
  return chromium.launch({
    executablePath,
    headless: true,
    args: [
      ...sparticuz.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
}

async function openTouchPage(): Promise<{ browser: Browser; page: Page }> {
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  const client = await context.newCDPSession(page);
  await client.send("Emulation.setEmulatedMedia", {
    features: [
      { name: "hover", value: "none" },
      { name: "pointer", value: "coarse" },
    ],
  });
  await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
  return { browser, page };
}

async function tapCard(page: Page, id: string) {
  const locator = page.locator(`[data-plp-card="${id}"]`);
  const box = await locator.boundingBox();
  if (!box) throw new Error(`no bbox ${id}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.4);
  await page.waitForTimeout(250);
}

describe("PLP commerce box touch E2E (iPhone 390)", () => {
  it("first tap reveals, second tap on image navigates, other card moves the box, Reservera works", async () => {
    const { browser, page } = await openTouchPage();
    try {
      const media = await page.evaluate(() => ({
        hoverNone: matchMedia("(hover: none)").matches,
        pointerCoarse: matchMedia("(pointer: coarse)").matches,
      }));
      expect(media.hoverNone).toBe(true);
      expect(media.pointerCoarse).toBe(true);

      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe(
        "0",
      );
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("a")),
      ).toBe(false);

      await tapCard(page, "a");
      expect(page.url()).toContain("plp-commerce-box-touch.html");
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("a")),
      ).toBe(true);
      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe(
        "1",
      );
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("b")),
      ).toBe(false);

      const reserveBox = await page
        .locator('[data-testid="reserve-a"]')
        .boundingBox();
      if (!reserveBox) throw new Error("no reserve button");
      await page.touchscreen.tap(
        reserveBox.x + reserveBox.width / 2,
        reserveBox.y + reserveBox.height / 2,
      );
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => window.__lastReserve)).toBe("a");
      expect(await page.evaluate(() => window.__navigated)).toBeNull();

      await page.evaluate(() => {
        window.__navigated = null;
      });
      await tapCard(page, "a");
      expect(await page.evaluate(() => window.__navigated)).toBe("/produkt/a");

      await page.evaluate(() => {
        window.__navigated = null;
      });
      const nameBox = await page
        .locator('[data-testid="name-link-a"]')
        .boundingBox();
      if (!nameBox) throw new Error("no name link");
      await page.touchscreen.tap(
        nameBox.x + nameBox.width / 2,
        nameBox.y + nameBox.height / 2,
      );
      await page.waitForTimeout(150);
      expect(await page.evaluate(() => window.__navigated)).toBe("/produkt/a");

      await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
      await tapCard(page, "a");
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("a")),
      ).toBe(true);
      await tapCard(page, "b");
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("a")),
      ).toBe(false);
      expect(
        await page.evaluate(() => window.__plpFixture.isRevealed("b")),
      ).toBe(true);
      expect(await page.evaluate(() => window.__plpFixture.opacity("b"))).toBe(
        "1",
      );
      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe(
        "0",
      );
    } finally {
      await browser.close();
    }
  }, 90_000);
});

declare global {
  interface Window {
    __plpFixture: {
      isRevealed: (id: string) => boolean;
      opacity: (id: string) => string;
    };
    __lastReserve?: string | null;
    __navigated?: string | null;
  }
}
