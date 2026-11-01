/**
 * Capture Dirtywine product card + inquiry form at 390 / 1440.
 * Prerequisites: Next on :3000 with Host dirtywine.se (/etc/hosts) and
 * NEXT_PUBLIC_DIRTYWINE_CHECKOUT_MODE=inquiry.
 *
 * Usage: node scripts/dirtywine-no-minimum-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/dirtywine-no-minimum");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";
const PRODUCT = `${BASE}/produkt/r-siste-2025`;
const SHOP = `${BASE}/vin`;
const INQUIRY = `${BASE}/b2b/inquiry`;
const KNOWN_WINE_ID = "8f142080-120b-419b-b213-32477b43f1af"; // Résiste 2025
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

async function addOneBottleViaApi(page) {
  // Resolve a sellable wine id from the PDP URL handle → product id on page.
  const wineId = await page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]'),
    );
    for (const s of scripts) {
      try {
        const data = JSON.parse(s.textContent || "{}");
        const sku = data?.sku || data?.productID || data?.["@id"];
        if (typeof sku === "string" && sku.length > 8) return sku;
      } catch {
        /* ignore */
      }
    }
    // Fallback: data attributes
    const el = document.querySelector("[data-product-id], [data-wine-id]");
    return (
      el?.getAttribute("data-product-id") ||
      el?.getAttribute("data-wine-id") ||
      null
    );
  });
  console.log("wineId from pdp", wineId);

  // Prefer clicking the real add button (warehouse).
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll("button"));
    const warehouse = buttons.find((b) =>
      /lager|warehouse/i.test(b.textContent || ""),
    );
    warehouse?.click();
    const add = buttons.find((b) => {
      const t = (b.textContent || "").toLowerCase();
      return (
        (t.includes("lägg till") || t.includes("add")) &&
        !t.includes("varukorg") &&
        !t.includes("cart")
      );
    });
    if (add) {
      add.click();
      return add.textContent?.trim() || true;
    }
    return false;
  });
  console.log("ui add", clicked);
  await new Promise((r) => setTimeout(r, 2000));

  // If UI add failed, call API with product id from pathname handle lookup.
  const cartQty = await page.evaluate(() => {
    const m = document.body.innerText.match(/Varukorg\s*\((\d+)\)/i);
    return m ? Number(m[1]) : 0;
  });
  console.log("cart qty after ui", cartQty);

  if (cartQty < 1) {
    const wineId = KNOWN_WINE_ID;
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
        lines: body.cart?.lines?.map((l) => ({
          q: l.quantity,
          title: l.merchandise?.product?.title || l.merchandise?.title,
        })),
      };
    }, wineId);
    console.log("api add", added);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

try {
  for (const width of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewport({
      width,
      height: width === 390 ? 844 : 900,
      deviceScaleFactor: 1,
    });

    // --- Product card on assortment ---
    const shopRes = await page.goto(SHOP, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log("shop", width, shopRes?.status());
    await page.waitForSelector("img", { timeout: 60000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 2500));

    if (width === 1440) {
      // Hover first card so commerce footer would show if present
      const card = await page.$(".group");
      if (card) await card.hover();
      await new Promise((r) => setTimeout(r, 800));
    } else {
      // Tap first card commerce strip into view
      await page.evaluate(() => {
        const card = document.querySelector(".group");
        card?.dispatchEvent(new Event("touchstart", { bubbles: true }));
        card?.scrollIntoView({ block: "center" });
      });
      await new Promise((r) => setTimeout(r, 800));
    }
    await shot(page, "product-card", width);

    // --- PDP + add 1 bottle ---
    const pdpRes = await page.goto(PRODUCT, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log("pdp", width, pdpRes?.status());
    await new Promise((r) => setTimeout(r, 2500));
    const minSix = await page.evaluate(() =>
      document.body.innerText.includes("Minst 6"),
    );
    console.log("pdp has Minst 6:", minSix);
    await addOneBottleViaApi(page);
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 500));

    // --- Inquiry form ---
    const inqRes = await page.goto(INQUIRY, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log("inquiry", width, inqRes?.status());
    await new Promise((r) => setTimeout(r, 2500));
    // Close cart drawer if auto-opened after add.
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const close = Array.from(document.querySelectorAll("button")).find((b) =>
        /stäng|close/i.test(b.getAttribute("aria-label") || b.textContent || ""),
      );
      close?.click();
    });
    await new Promise((r) => setTimeout(r, 1000));
    const inqText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log("inquiry preview:", inqText.replace(/\s+/g, " ").slice(0, 250));
    await shot(page, "inquiry-form", width);

    await page.close();
  }
} finally {
  await browser.close();
}
