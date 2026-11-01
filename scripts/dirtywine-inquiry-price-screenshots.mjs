/**
 * Design-review screenshots for Dirtywine inquiry B2B price (132 kr).
 *
 * - Product card: live dirtywine.se assortment (Host dirtywine.se)
 * - Cart drawer + inquiry: #138-style HTML fixtures (Geist + real logo)
 *
 * Usage: node scripts/dirtywine-inquiry-price-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT = path.resolve("docs/design-review/dirtywine-inquiry-price");
fs.mkdirSync(OUT, { recursive: true });

const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";
const WIDTHS = [390, 1440];
const SHOP = "https://dirtywine.se/vin";

const browser = await puppeteer.launch({
  headless: true,
  executablePath: CHROME,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function shot(page, name, width) {
  const file = path.join(OUT, `${name}-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

try {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: width === 390 ? 844 : 900,
      deviceScaleFactor: 1,
    });

    // --- Live product card (Résiste 132) ---
    const shopRes = await page.goto(SHOP, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    console.log("shop", width, shopRes?.status());
    await page.waitForFunction(
      () => /R[ÉE]SISTE/i.test(document.body.innerText),
      { timeout: 60000 },
    );
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll(".group, article, a"));
      const hit = cards.find((el) =>
        /R[ÉE]SISTE\s*2025/i.test(el.textContent || ""),
      );
      hit?.scrollIntoView({ block: "center" });
    });
    await new Promise((r) => setTimeout(r, 1500));
    // Crop to the Résiste card when possible
    const cardHandle = await page.evaluateHandle(() => {
      const nodes = Array.from(
        document.querySelectorAll(".group, [data-product], article"),
      );
      return (
        nodes.find((el) => /R[ÉE]SISTE\s*2025/i.test(el.textContent || "")) ||
        null
      );
    });
    const el = cardHandle.asElement();
    if (el) {
      const box = await el.boundingBox();
      if (box) {
        // Pad so header/context still show Dirtywine chrome for 390
        await page.screenshot({
          path: path.join(OUT, `card-${width}.png`),
          clip: {
            x: Math.max(0, box.x - 8),
            y: Math.max(0, box.y - 8),
            width: Math.min(width - 8, box.width + 16),
            height: Math.min(box.height + 16, width === 390 ? 520 : 640),
          },
        });
        console.log("wrote card clip", width);
      } else {
        await shot(page, "card", width);
      }
    } else {
      await shot(page, "card", width);
    }

    // Full-viewport assortment with Résiste in view (design-review primary)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => {
      const hit = Array.from(document.querySelectorAll(".group, article")).find(
        (el) => /R[ÉE]SISTE\s*2025/i.test(el.textContent || ""),
      );
      hit?.scrollIntoView({ block: "start" });
    });
    await new Promise((r) => setTimeout(r, 800));
    // Prefer full page chrome shot as card-* (overwrite clip if too tight)
    await page.screenshot({
      path: path.join(OUT, `card-${width}.png`),
      fullPage: false,
    });
    console.log("wrote card viewport", width);

    // --- Cart fixture ---
    const cartUrl = pathToFileURL(
      path.join(OUT, "cart-drawer-1bottle-132.html"),
    ).href;
    await page.goto(cartUrl, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, "cart", width);

    // --- Inquiry fixture ---
    const inqUrl = pathToFileURL(
      path.join(OUT, "inquiry-1bottle-132.html"),
    ).href;
    await page.goto(inqUrl, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 600));
    await shot(page, "inquiry", width);

    await page.close();
  }
} finally {
  await browser.close();
}
