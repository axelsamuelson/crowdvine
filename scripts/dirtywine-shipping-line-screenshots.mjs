/**
 * Capture Dirty Wine cart at 390 / 1440 — closed (badge) and open drawer —
 * after shipping-line copy change. Expects non-zero B2B price and
 * "Frakt … ingår i priset (leverans i Stockholm ingår)".
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
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  process.env.CHROME_PATH ||
  "/home/ubuntu/.cache/puppeteer/chrome/linux-143.0.7499.192/chrome-linux64/chrome";
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
    const line = body.cart?.lines?.[0];
    return {
      ok: res.ok,
      status: res.status,
      total: body.cart?.totalQuantity,
      b2bPriceExclVat: line?.merchandise?.product?.b2bPriceExclVat ?? null,
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

async function closeCartDrawer(page) {
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    const close = Array.from(document.querySelectorAll("button")).find((b) =>
      /stäng|close/i.test(b.getAttribute("aria-label") || b.textContent || ""),
    );
    close?.click();
  });
  await new Promise((r) => setTimeout(r, 600));
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
    if (
      added.b2bPriceExclVat == null ||
      Number(added.b2bPriceExclVat) <= 0
    ) {
      throw new Error(
        `Expected non-zero b2bPriceExclVat at ${width}: ${JSON.stringify(added)}`,
      );
    }
    console.log("b2bPriceExclVat", added.b2bPriceExclVat);

    // add-quantity dispatches cart-refresh which opens the drawer — close first.
    await new Promise((r) => setTimeout(r, 800));
    await closeCartDrawer(page);
    await page.evaluate(() => {
      // Ensure drawer is not in the accessibility tree as open.
      const dialog = document.querySelector('[role="dialog"], [data-state="open"]');
      if (dialog) {
        const close = Array.from(document.querySelectorAll("button")).find((b) =>
          /stäng|close/i.test(
            b.getAttribute("aria-label") || b.textContent || "",
          ),
        );
        close?.click();
      }
    });
    await new Promise((r) => setTimeout(r, 800));
    const closedText = await page.evaluate(() =>
      document.body.innerText.replace(/\s+/g, " ").slice(0, 300),
    );
    console.log("closed text snippet:", closedText);
    if (/ingår i priset/i.test(closedText)) {
      throw new Error(
        `Cart still open when capturing closed shot at ${width}`,
      );
    }
    await shot(page, "cart-closed", width);

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
    if (/0\s*kr/i.test(cartText) && !/\d+[1-9]\s*kr|[1-9]\d*\s*kr/i.test(cartText)) {
      throw new Error(`Cart prices look like 0 kr at ${width}: ${cartText.slice(0, 600)}`);
    }
    if (!/\d+\s*kr/i.test(cartText) || /(?<!\d)0\s*kr/i.test(cartText.split(/Totalt|Total/i).pop() || "")) {
      // Soft check: total line must not be 0 kr; require a positive kr amount in view.
      const amounts = [...cartText.matchAll(/(\d+)\s*kr/gi)].map((m) => Number(m[1]));
      console.log("kr amounts", amounts);
      if (!amounts.some((n) => n > 0)) {
        throw new Error(`No positive kr amounts in cart at ${width}: ${cartText.slice(0, 600)}`);
      }
    }
    await shot(page, "cart-drawer", width);
    await closeCartDrawer(page);
    await context.close();
  }
} finally {
  await browser.close();
}
