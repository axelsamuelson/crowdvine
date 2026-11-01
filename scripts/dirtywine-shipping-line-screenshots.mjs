/**
 * Capture Dirty Wine cart drawer at 390 / 1440 after shipping-line copy change.
 * Expects "Frakt … ingår i priset (leverans i Stockholm ingår)".
 *
 * Prerequisites: Next on :3000, /etc/hosts dirtywine.se → 127.0.0.1,
 * DIRTYWINE_CHECKOUT_MODE=inquiry.
 *
 * Usage: node scripts/dirtywine-shipping-line-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/dirtywine-shipping-line");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";
const PRODUCT = `${BASE}/produkt/r-siste-2025`;
const KNOWN_WINE_ID = "8f142080-120b-419b-b213-32477b43f1af";
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";
const WIDTHS = [390, 1440];
const SHIPPING_SNIPPET = "ingår i priset (leverans i Stockholm ingår)";

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

async function ensureOneBottle(page) {
  const added = await page.evaluate(async (variantId) => {
    const res = await fetch("/api/cart/add-quantity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId,
        quantity: 1,
        source: "warehouse",
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.cart) {
      window.dispatchEvent(
        new CustomEvent("cart-refresh", { detail: body.cart }),
      );
    }
    return {
      ok: res.ok,
      status: res.status,
      total: body.cart?.totalQuantity,
      error: body.error,
    };
  }, KNOWN_WINE_ID);
  console.log("api add", added);
  return added;
}

async function openCartDrawer(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button, a"));
    const cart = buttons.find((b) =>
      /varukorg|cart/i.test(
        `${b.getAttribute("aria-label") || ""} ${b.textContent || ""}`,
      ),
    );
    cart?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
}

try {
  for (const width of WIDTHS) {
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({
      width,
      height: width === 390 ? 844 : 900,
      deviceScaleFactor: 1,
    });

    const pdpRes = await page.goto(PRODUCT, {
      waitUntil: "networkidle2",
      timeout: 180000,
    });
    console.log("pdp", width, pdpRes?.status());
    await new Promise((r) => setTimeout(r, 2000));

    const added = await ensureOneBottle(page);
    if (!added?.ok || !(added.total >= 1)) {
      throw new Error(
        `Expected cart with ≥1 bottle at ${width}: ${JSON.stringify(added)}`,
      );
    }

    await openCartDrawer(page);
    const cartText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " "),
    );
    console.log("cart text snippet:", cartText.slice(0, 500));
    if (!cartText.includes(SHIPPING_SNIPPET)) {
      throw new Error(
        `Cart drawer missing shipping copy at ${width}: ${cartText.slice(0, 600)}`,
      );
    }
    if (/Beräknas i kassan/i.test(cartText)) {
      throw new Error(
        `Cart still shows PACT shipping copy at ${width}: ${cartText.slice(0, 600)}`,
      );
    }
    await shot(page, "cart-drawer", width);
    await context.close();
  }
} finally {
  await browser.close();
}
