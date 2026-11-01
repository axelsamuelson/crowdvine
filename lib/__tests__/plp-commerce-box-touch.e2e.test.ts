/**
 * E2E: PLP commerce-box first-tap reveal on a real touch-emulated iPhone viewport.
 * Uses Puppeteer (CI-available) with hasTouch / isMobile — not a narrow desktop window.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import puppeteer, { type Page } from "puppeteer";

const FIXTURE = pathToFileURL(
  path.resolve(__dirname, "fixtures/plp-commerce-box-touch.html"),
).href;

async function openTouchPage(): Promise<{
  browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  page: Page;
}> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    isLandscape: false,
  });
  const client = await page.createCDPSession();
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: true });
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
  const handle = await page.$(`[data-plp-card="${id}"]`);
  if (!handle) throw new Error(`missing card ${id}`);
  const box = await handle.boundingBox();
  if (!box) throw new Error(`no bbox ${id}`);
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.4);
  await new Promise((r) => setTimeout(r, 250));
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

      // Hidden by default
      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe("0");
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("a"))).toBe(
        false,
      );

      // First tap: reveal, stay on fixture (no navigation)
      await tapCard(page, "a");
      expect(page.url()).toContain("plp-commerce-box-touch.html");
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("a"))).toBe(
        true,
      );
      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe("1");
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("b"))).toBe(
        false,
      );

      // Reservera works while revealed
      await page.touchscreen.tap(
        ...(await page.$eval('[data-testid="reserve-a"]', (el) => {
          const r = el.getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2] as [number, number];
        })),
      );
      await new Promise((r) => setTimeout(r, 150));
      expect(await page.evaluate(() => window.__lastReserve)).toBe("a");
      expect(await page.evaluate(() => window.__navigated)).toBeNull();

      // Second tap on image opens PDP (recorded navigation; first tap was intercepted)
      await page.evaluate(() => {
        window.__navigated = null;
      });
      await tapCard(page, "a");
      expect(await page.evaluate(() => window.__navigated)).toBe("/produkt/a");

      // Name link also opens PDP when box is visible
      await page.evaluate(() => {
        window.__navigated = null;
      });
      await page.touchscreen.tap(
        ...(await page.$eval('[data-testid="name-link-a"]', (el) => {
          const r = el.getBoundingClientRect();
          return [r.x + r.width / 2, r.y + r.height / 2] as [number, number];
        })),
      );
      await new Promise((r) => setTimeout(r, 150));
      expect(await page.evaluate(() => window.__navigated)).toBe("/produkt/a");

      // Tapping another card moves the box
      await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });
      await tapCard(page, "a");
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("a"))).toBe(
        true,
      );
      await tapCard(page, "b");
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("a"))).toBe(
        false,
      );
      expect(await page.evaluate(() => window.__plpFixture.isRevealed("b"))).toBe(
        true,
      );
      expect(await page.evaluate(() => window.__plpFixture.opacity("b"))).toBe("1");
      expect(await page.evaluate(() => window.__plpFixture.opacity("a"))).toBe("0");
    } finally {
      await browser.close();
    }
  }, 60_000);
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
