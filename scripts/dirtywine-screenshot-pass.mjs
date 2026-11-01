/**
 * Capture Dirtywine pages via local Next with Host: dirtywine.se.
 * Usage: node scripts/dirtywine-screenshot-pass.mjs <before|after>
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const pass = process.argv[2];
if (pass !== "before" && pass !== "after") {
  console.error("Usage: node scripts/dirtywine-screenshot-pass.mjs <before|after>");
  process.exit(1);
}

const OUT = path.resolve("docs/design-review/dirtywine-swedish-ui");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";
const PRODUCT = `${BASE}/produkt/vermentino-2022`;
const PAGES = [
  { name: "home", url: `${BASE}/` },
  { name: "assortment", url: `${BASE}/vin` },
  { name: "product", url: PRODUCT },
];
const WIDTHS = [390, 1440];

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const pageDef of PAGES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({
        width,
        height: width === 390 ? 844 : 900,
        deviceScaleFactor: 1,
      });
      // Host resolution via /etc/hosts → 127.0.0.1; Next serves dirtywine via Host header.
      const res = await page.goto(pageDef.url, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      console.log(pass, pageDef.name, width, res?.status());
      // Let client shopping-context hydrate
      await new Promise((r) => setTimeout(r, 1500));
      const file = path.join(OUT, `${pass}-${pageDef.name}-${width}.png`);
      await page.screenshot({ path: file, fullPage: false });
      console.log("wrote", file);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
