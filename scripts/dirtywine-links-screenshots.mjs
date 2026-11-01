/**
 * Capture dirtywine.se header+footer, PDP, open cart at 390 and 1440.
 * Usage: node /tmp/dw-links-screenshots.mjs <before|after> <baseUrl>
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const pass = process.argv[2];
const BASE = (process.argv[3] || "https://dirtywine.se").replace(/\/$/, "");
if (pass !== "before" && pass !== "after") {
  console.error("Usage: ... <before|after> <baseUrl>");
  process.exit(1);
}

const OUT = path.resolve("docs/design-review/dirtywine-links");
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { w: 390, h: 844 },
  { w: 1440, h: 900 },
];

async function dismissCookies(page) {
  try {
    const btns = await page.$x("//button[contains(., 'Acceptera') or contains(., 'Accept') or contains(., 'OK')]");
    if (btns[0]) await btns[0].click();
  } catch {}
  try {
    await page.evaluate(() => {
      document.querySelectorAll('[class*="cookie"], [id*="cookie"]').forEach((el) => {
        if (el instanceof HTMLElement && /cookie|consent/i.test(el.className + el.id)) {
          // leave alone
        }
      });
    });
  } catch {}
}

async function collectCors(page) {
  const cors = [];
  page.on("console", (msg) => {
    const t = msg.text();
    if (/cors|cross-origin|Access-Control/i.test(t)) cors.push(t);
  });
  page.on("pageerror", (err) => {
    if (/cors|cross-origin/i.test(String(err))) cors.push(String(err));
  });
  page.on("requestfailed", (req) => {
    const f = req.failure()?.errorText || "";
    if (/cors|access control/i.test(f) || /pactwines\.com/i.test(req.url())) {
      cors.push(`${f} ${req.url()}`);
    }
  });
  return cors;
}

async function openCart(page) {
  // Try click cart button
  const clicked = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll("button, a"));
    const cart = candidates.find((el) =>
      /varukorg|cart|\(\d+\)/i.test(el.textContent || ""),
    );
    if (cart) {
      cart.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    // dispatch open event used by the app
    await page.evaluate(() => {
      window.dispatchEvent(new Event("cart-open-request"));
    });
  }
  await new Promise((r) => setTimeout(r, 800));
}

async function tryAddToCart(page) {
  // On PDP: click add/reserve button
  const added = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const add = btns.find((b) =>
      /lägg|reservera|add|förfrågan|skicka|inquiry|köp/i.test(b.textContent || ""),
    );
    if (add && !add.disabled) {
      add.click();
      return add.textContent?.trim() || true;
    }
    return false;
  });
  await new Promise((r) => setTimeout(r, 1500));
  return added;
}

async function shot(page, name) {
  const file = path.join(OUT, `${pass}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
}

async function shotFooter(page, name) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 600));
  const file = path.join(OUT, `${pass}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  await page.evaluate(() => window.scrollTo(0, 0));
}

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const corsReport = {};

try {
  // Find a product handle from /vin
  const probe = await browser.newPage();
  await probe.setViewport({ width: 1440, height: 900 });
  await probe.goto(`${BASE}/vin`, { waitUntil: "networkidle2", timeout: 120000 });
  const productHref = await probe.evaluate(() => {
    const a = document.querySelector('a[href*="/produkt/"], a[href*="/product/"]');
    return a?.getAttribute("href") || null;
  });
  await probe.close();
  const productUrl = productHref
    ? productHref.startsWith("http")
      ? productHref
      : `${BASE}${productHref}`
    : `${BASE}/produkt/vermentino-2022`;
  console.log("productUrl", productUrl);

  for (const { w, h } of WIDTHS) {
    const page = await browser.newPage();
    const cors = await collectCors(page);
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });

    // HOME header
    await page.goto(`${BASE}/`, { waitUntil: "networkidle2", timeout: 120000 });
    await dismissCookies(page);
    await new Promise((r) => setTimeout(r, 1000));
    await shot(page, `home-header-${w}`);
    await shotFooter(page, `home-footer-${w}`);

    // Open mobile menu on 390 to show nav links absence
    if (w === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find((b) =>
          /meny|menu/i.test(b.textContent || ""),
        );
        btn?.click();
      });
      await new Promise((r) => setTimeout(r, 700));
      await shot(page, `home-menu-${w}`);
      // close menu
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 400));
    }

    // PLP
    await page.goto(`${BASE}/vin`, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1000));
    await shot(page, `plp-header-${w}`);

    // PDP
    await page.goto(productUrl, { waitUntil: "networkidle2", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 1200));
    await shot(page, `pdp-${w}`);
    // scroll a bit to show hemleverans strip if below fold
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 400));
    await shot(page, `pdp-delivery-${w}`);

    // Add to cart then open cart
    const added = await tryAddToCart(page);
    console.log("addToCart", w, added);
    await openCart(page);
    await shot(page, `cart-${w}`);

    corsReport[`${pass}-${w}`] = [...new Set(cors)].slice(0, 40);
    console.log("cors count", pass, w, corsReport[`${pass}-${w}`].length);
    await page.close();
  }
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(OUT, `${pass}-cors-report.json`),
  JSON.stringify(corsReport, null, 2),
);
console.log("done", pass);
