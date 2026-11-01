/**
 * Capture pactwines.com PLP + PDP at 390 and 1440 via local Next.
 * Usage: node /tmp/plp-card-screenshots.mjs <before|after>
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const pass = process.argv[2];
if (pass !== "before" && pass !== "after") {
  console.error("Usage: node ... <before|after>");
  process.exit(1);
}

const OUT_DIRS = [
  path.resolve("docs/design-review/plp-card"),
  path.resolve("/opt/cursor/artifacts/plp-card-screenshots"),
];
for (const d of OUT_DIRS) fs.mkdirSync(d, { recursive: true });

const BASE = "http://pactwines.com:3000";
const PAGES = [
  { name: "plp", url: `${BASE}/vin` },
  { name: "pdp", url: `${BASE}/produkt/l-2023` },
];
const VIEWPORTS = [
  { label: "mobile-390", width: 390, height: 844 },
  { label: "desktop-1440", width: 1440, height: 900 },
];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const pageDef of PAGES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
      });
      const res = await page.goto(pageDef.url, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      console.log(pass, pageDef.name, vp.label, res?.status());
      // Allow client hydration / static grid swap
      await new Promise((r) => setTimeout(r, 2500));
      // Ensure we're scrolled to top so cards are visible
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 300));
      const filename = `${pass}-${pageDef.name}-${vp.label}.png`;
      for (const dir of OUT_DIRS) {
        const file = path.join(dir, filename);
        await page.screenshot({ path: file, fullPage: false });
        console.log("wrote", file);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
