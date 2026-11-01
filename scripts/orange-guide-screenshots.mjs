import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const OUT_DIR = path.resolve("docs/design-review/orange-guide");
const URL =
  process.env.ORANGE_GUIDE_URL ||
  "https://crowdvine-mizcyg4ob-avesamuelson-7603s-projects.vercel.app/guider/basta-orange-naturviner-systembolaget?_vercel_share=7oapZI2BACAmOxlmroHCqoyYY4PKj8Sn";

const widths = [
  { width: 390, height: 844, name: "orange-guide-390.png" },
  { width: 1440, height: 900, name: "orange-guide-1440.png" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome-stable",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const viewport of widths) {
    const page = await browser.newPage();
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
    });
    await page.goto(URL, { waitUntil: "networkidle2", timeout: 120_000 });
    await page.waitForFunction(
      () => document.body?.innerText?.includes("Bra orange vin på Systembolaget"),
      { timeout: 60_000 },
    );
    // Dismiss common cookie/consent overlays if present.
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      for (const button of buttons) {
        const label = (button.textContent || "").trim().toLowerCase();
        if (
          label.includes("acceptera") ||
          label.includes("accept") ||
          label.includes("godkänn")
        ) {
          button.click();
        }
      }
    });
    await new Promise((r) => setTimeout(r, 500));
    const out = path.join(OUT_DIR, viewport.name);
    await page.screenshot({ path: out, fullPage: true });
    console.log("wrote", out);
    await page.close();
  }
} finally {
  await browser.close();
}
