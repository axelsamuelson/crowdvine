/**
 * Capture exit-discount cart block screenshots (flag forced on via .env.local).
 * Usage: node scripts/exit-discount-cart-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/exit-discount-cart");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";
const PAGE = `${BASE}/dev/exit-discount-cart`;
const WIDTHS = [
  { width: 375, height: 812, label: "mobile-375" },
  { width: 1440, height: 900, label: "desktop-1440" },
];

async function screenshot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  for (const vp of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
    });

    let submitMode = "live";
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        submitMode === "mock" &&
        req.method() === "POST" &&
        req.url().includes("/api/exit-discount")
      ) {
        void req.respond({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            code: "PACT10-TEST",
            expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
          }),
        });
        return;
      }
      void req.continue();
    });

    const res = await page.goto(PAGE, {
      waitUntil: "networkidle2",
      timeout: 120000,
    });
    console.log(vp.label, "status", res?.status());
    await page.waitForSelector("[data-exit-discount-cart-block]", {
      timeout: 30000,
    });
    await page.$eval("[data-exit-discount-cart-block]", (el) => {
      el.scrollIntoView({ block: "center" });
    });
    await screenshot(page, `${vp.label}-cart-offer`);

    await page.click("#exit-discount-cart-email", { clickCount: 3 });
    await page.type("#exit-discount-cart-email", "design-review@example.com", {
      delay: 15,
    });
    await page.click("[data-exit-discount-age]");
    await new Promise((r) => setTimeout(r, 250));
    await screenshot(page, `${vp.label}-cart-filled`);

    await page.click("[data-exit-discount-submit]");
    try {
      await page.waitForSelector("[data-exit-discount-account-step]", {
        timeout: 8000,
      });
    } catch {
      console.log(vp.label, "live submit failed; mock retry");
      submitMode = "mock";
      if (await page.$("#exit-discount-cart-email")) {
        await page.click("[data-exit-discount-submit]");
        await page.waitForSelector("[data-exit-discount-account-step]", {
          timeout: 10000,
        });
      }
    }

    await page.$eval("[data-exit-discount-account-step]", (el) => {
      el.scrollIntoView({ block: "center" });
    });
    await screenshot(page, `${vp.label}-cart-account-step`);
    await page.close();
  }

  fs.writeFileSync(
    path.join(OUT, "README.md"),
    `# Exit-discount cart block design review

Real rendered screenshots of the inline cart offer (not a modal), with
\`NEXT_PUBLIC_EXIT_DISCOUNT_ENABLED=true\` / \`EXIT_DISCOUNT_ENABLED=true\` forced
**locally only**. Code default and production remain OFF.

Surface: \`/dev/exit-discount-cart\` (404 when flag off).

## Files

| File | State |
| --- | --- |
| \`mobile-375-cart-offer.png\` | Offer block in cart @ 375 |
| \`desktop-1440-cart-offer.png\` | Offer block in cart @ 1440 |
| \`mobile-375-cart-filled.png\` | Filled form, newsletter unchecked @ 375 |
| \`desktop-1440-cart-filled.png\` | Filled form @ 1440 |
| \`mobile-375-cart-account-step.png\` | Skippable account step @ 375 |
| \`desktop-1440-cart-account-step.png\` | Skippable account step @ 1440 |

## Analytics

- \`exit_discount_shown\` — once per analytics session when the block mounts
- \`exit_discount_submitted\` — on successful form submit
`,
  );
} finally {
  await browser.close();
}
