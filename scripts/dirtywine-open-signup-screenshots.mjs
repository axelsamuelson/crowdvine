/**
 * Screenshots for Dirtywine open sign-up design review.
 * Fixtures: signup form + login/ny kund. Live: PLP + PDP.
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const OUT = path.resolve("docs/design-review/dirtywine-open-signup");
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [390, 1440];
const LOGO =
  "https://abrnvjqwpdkodgrtezeg.supabase.co/storage/v1/object/public/uploads/fe06af9d-ee01-418b-8b77-9d1b0c435bac.svg";

const FIXTURES = [
  {
    name: "signup-form",
    file: path.join(OUT, "signup-form.html"),
  },
  {
    name: "login-ny-kund",
    file: path.join(OUT, "login-ny-kund.html"),
  },
];

const LIVE = [
  { name: "plp", url: "https://dirtywine.se/vin" },
  { name: "pdp", url: "https://dirtywine.se/produkt/vermentino-2022" },
];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const fixture of FIXTURES) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({
        width,
        height: width === 390 ? 844 : 900,
        deviceScaleFactor: 1,
      });
      const url = pathToFileURL(fixture.file).href;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      // Ensure logo painted
      await page.waitForSelector(`img[src="${LOGO}"]`, { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 400));
      const out = path.join(OUT, `${fixture.name}-${width}.png`);
      await page.screenshot({ path: out, fullPage: false });
      console.log("wrote", out);
      await page.close();
    }
  }

  for (const live of LIVE) {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({
        width,
        height: width === 390 ? 844 : 900,
        deviceScaleFactor: 1,
      });
      const res = await page.goto(live.url, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      console.log(live.name, width, res?.status());
      await new Promise((r) => setTimeout(r, 2000));
      const out = path.join(OUT, `${live.name}-${width}.png`);
      await page.screenshot({ path: out, fullPage: false });
      console.log("wrote", out);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
