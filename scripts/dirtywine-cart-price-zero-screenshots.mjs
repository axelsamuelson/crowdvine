/**
 * Capture Dirty Wine cart drawer + /b2b/inquiry at 390 / 1440 after the
 * cart-service b2bPriceExclVat fix. Expects 1× Résiste @ 132 kr.
 *
 * Prerequisites: Next on :3000, /etc/hosts dirtywine.se → 127.0.0.1,
 * DIRTYWINE_CHECKOUT_MODE=inquiry.
 *
 * Usage: node scripts/dirtywine-cart-price-zero-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/dirtywine-cart-price-zero");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";
const PRODUCT = `${BASE}/produkt/r-siste-2025`;
const INQUIRY = `${BASE}/b2b/inquiry`;
const KNOWN_WINE_ID = "8f142080-120b-419b-b213-32477b43f1af";
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";
const WIDTHS = [390, 1440];

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
    const line = body.cart?.lines?.[0];
    return {
      ok: res.ok,
      status: res.status,
      total: body.cart?.totalQuantity,
      b2bPriceExclVat: line?.merchandise?.product?.b2bPriceExclVat ?? null,
      title: line?.merchandise?.product?.title || line?.merchandise?.title,
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
  await new Promise((r) => setTimeout(r, 1200));
}

try {
  for (const width of WIDTHS) {
    // Fresh context → empty cart cookie per viewport (exactly 1 bottle).
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
    if (!added?.ok || added.b2bPriceExclVat !== 132) {
      throw new Error(
        `Expected 132 kr cart line at ${width}: ${JSON.stringify(added)}`,
      );
    }
    console.log("b2bPriceExclVat from cart API:", added.b2bPriceExclVat);

    await openCartDrawer(page);
    const cartText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 400),
    );
    console.log("cart text:", cartText);
    if (!/132\s*kr/i.test(cartText)) {
      throw new Error(`Cart drawer missing 132 kr at ${width}: ${cartText}`);
    }
    await shot(page, "cart", width);

    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 400));

    const inqRes = await page.goto(INQUIRY, {
      waitUntil: "networkidle2",
      timeout: 180000,
    });
    console.log("inquiry", width, inqRes?.status());
    await new Promise((r) => setTimeout(r, 2000));
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const close = Array.from(document.querySelectorAll("button")).find((b) =>
        /stäng|close/i.test(
          b.getAttribute("aria-label") || b.textContent || "",
        ),
      );
      close?.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const inqText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 400),
    );
    console.log("inquiry text:", inqText);
    if (!/132\s*kr/i.test(inqText)) {
      throw new Error(`Inquiry missing 132 kr at ${width}: ${inqText}`);
    }
    await shot(page, "inquiry", width);

    await context.close();
  }
} finally {
  await browser.close();
}
