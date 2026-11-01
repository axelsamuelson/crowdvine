/**
 * Verify ISR PR preview on PACT (default host) and Dirty Wine (local host
 * proxy so window.location is dirtywine.se while HTML comes from the preview).
 *
 * Captures home / PLP / PDP / open-cart at 390 and 1440 for both brands.
 *
 * Usage:
 *   PREVIEW_BASE=https://….vercel.app \
 *   VERCEL_SHARE=… \
 *   node scripts/isr-preview-verify-screenshots.mjs
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import puppeteer from "puppeteer";

const OUT = path.resolve("docs/design-review/isr");
fs.mkdirSync(OUT, { recursive: true });

const PREVIEW_BASE = (
  process.env.PREVIEW_BASE ||
  "https://crowdvine-noklzyjq6-avesamuelson-7603s-projects.vercel.app"
).replace(/\/$/, "");
const SHARE = process.env.VERCEL_SHARE || "fBf686eNZQuqdXVjJjcgOuTz51OCKuhu";
const PRODUCT_HANDLE = process.env.PRODUCT_HANDLE || "l-2023";
const PROXY_PORT = Number(process.env.DIRTYWINE_PROXY_PORT || 3099);
const CHROME =
  process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome";
const WIDTHS = [390, 1440];
const KNOWN_WINE_ID =
  process.env.KNOWN_WINE_ID || "8f142080-120b-419b-b213-32477b43f1af";

const previewUrl = new URL(PREVIEW_BASE);
const report = {
  previewBase: PREVIEW_BASE,
  checks: [],
  failures: [],
};

function logCheck(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  console.log(ok ? "OK " : "FAIL ", name, detail || "");
  if (!ok) report.failures.push({ name, detail });
}

async function bootstrapShareCookie() {
  const jarPath = "/tmp/isr-vercel-share.jar";
  const { execFileSync } = await import("node:child_process");
  execFileSync(
    "curl",
    [
      "-sS",
      "-c",
      jarPath,
      "-b",
      jarPath,
      "-L",
      "--max-redirs",
      "5",
      "-o",
      "/dev/null",
      `${PREVIEW_BASE}/?_vercel_share=${SHARE}`,
    ],
    { stdio: "inherit" },
  );
  const jar = fs.readFileSync(jarPath, "utf8");
  const match = jar.match(/_vercel_jwt\t([^\s]+)/);
  if (!match) throw new Error("Failed to obtain _vercel_jwt from share URL");
  return match[1];
}

function startDirtywineProxy(jwt) {
  const server = http.createServer((req, res) => {
    const targetPath = req.url || "/";
    const headers = {
      ...req.headers,
      host: previewUrl.host,
      cookie: `_vercel_jwt=${jwt}`,
      "x-forwarded-host": "dirtywine.se",
      "accept-encoding": "identity",
    };
    delete headers["content-length"];

    const upstream = https.request(
      {
        protocol: previewUrl.protocol,
        hostname: previewUrl.hostname,
        port: previewUrl.port || 443,
        path: targetPath,
        method: req.method,
        headers,
      },
      (up) => {
        const outHeaders = { ...up.headers };
        // Keep browser on local Dirty Wine origin.
        if (outHeaders["set-cookie"]) {
          const cookies = Array.isArray(outHeaders["set-cookie"])
            ? outHeaders["set-cookie"]
            : [outHeaders["set-cookie"]];
          outHeaders["set-cookie"] = cookies.map((c) =>
            c
              .replace(/;\s*Domain=[^;]+/gi, "")
              .replace(/;\s*Secure/gi, "")
              .replace(/;\s*SameSite=[^;]+/gi, "; SameSite=Lax"),
          );
        }
        if (outHeaders.location) {
          outHeaders.location = String(outHeaders.location).replace(
            PREVIEW_BASE,
            `http://dirtywine.se:${PROXY_PORT}`,
          );
        }
        res.writeHead(up.statusCode || 502, outHeaders);
        up.pipe(res);
      },
    );
    upstream.on("error", (err) => {
      res.writeHead(502, { "content-type": "text/plain" });
      res.end(`proxy error: ${err.message}`);
    });
    req.pipe(upstream);
  });

  return new Promise((resolve) => {
    server.listen(PROXY_PORT, "127.0.0.1", () => resolve(server));
  });
}

async function applyJwtCookie(page, jwt, domain) {
  await page.setCookie({
    name: "_vercel_jwt",
    value: jwt,
    domain,
    path: "/",
    httpOnly: true,
    secure: domain !== "dirtywine.se",
  });
}

async function pageText(page) {
  return page.evaluate(() =>
    document.body?.innerText?.replace(/\s+/g, " ").slice(0, 2500),
  );
}

async function assertPrices(page, label) {
  const text = await pageText(page);
  const hasZeroOnly =
    /\b0\s*kr\b/i.test(text) && !/\b([1-9]\d{1,3})\s*kr\b/i.test(text);
  const hasPrice = /\b([1-9]\d{1,3})\s*kr\b/i.test(text);
  logCheck(`${label}: non-zero prices`, hasPrice && !hasZeroOnly, {
    sample: text.match(/\b\d+\s*kr\b/gi)?.slice(0, 8),
  });
  return text;
}

async function assertBranding(page, label, expectDirty) {
  const info = await page.evaluate(() => ({
    host: location.hostname,
    title: document.title,
    text: document.body?.innerText?.replace(/\s+/g, " ").slice(0, 800) || "",
  }));
  const dirty =
    /dirty\s*wine/i.test(info.title) ||
    /dirty\s*wine/i.test(info.text) ||
    info.host.includes("dirtywine");
  const pact = /pact/i.test(info.title) || /pact/i.test(info.text);
  if (expectDirty) {
    logCheck(`${label}: Dirty Wine branding`, dirty, info);
  } else {
    logCheck(`${label}: PACT branding`, pact && !info.host.includes("dirtywine"), {
      title: info.title,
      host: info.host,
    });
  }
}

async function assertLoggedOutChrome(page, label, { requireLoginCopy = true } = {}) {
  const state = await page.evaluate(() => {
    const text = document.body?.innerText || "";
    const hasLogin =
      /logga in|log in|sign in|profil/i.test(text) ||
      !!document.querySelector(
        'a[href*="log-in"], a[href*="login"], button[aria-label*="profil" i], a[aria-label*="profil" i], a[href*="profile"]',
      );
    const hasHeader = !!document.querySelector("header") || /meny|varukorg|butik/i.test(text);
    const cartBadge = Array.from(document.querySelectorAll("button, a")).find(
      (el) => /varukorg|cart/i.test(`${el.getAttribute("aria-label") || ""} ${el.textContent || ""}`),
    );
    return {
      hasLogin,
      hasHeader,
      cartLabel: cartBadge
        ? `${cartBadge.getAttribute("aria-label") || ""} ${cartBadge.textContent || ""}`.trim()
        : null,
    };
  });
  if (requireLoginCopy) {
    logCheck(`${label}: login/profile chrome present`, state.hasLogin, state);
  } else {
    logCheck(`${label}: header chrome present`, state.hasHeader, state);
  }
  logCheck(
    `${label}: anonymous cart chrome present`,
    Boolean(state.cartLabel) || /varukorg|cart|lägg i/i.test(state.cartLabel || ""),
    state.cartLabel,
  );
}

async function addBottleViaApi(page) {
  return page.evaluate(async (variantId) => {
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
      amount: line?.cost?.totalAmount?.amount ?? line?.merchandise?.price?.amount,
      b2bPriceExclVat: line?.merchandise?.product?.b2bPriceExclVat ?? null,
      title: line?.merchandise?.product?.title || line?.merchandise?.title,
      error: body.error,
    };
  }, KNOWN_WINE_ID);
}

async function openCart(page) {
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

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log("wrote", file);
  return file;
}

async function runHostPass({
  brand,
  base,
  jwt,
  cookieDomain,
  expectDirty,
}) {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    for (const width of WIDTHS) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({
        width,
        height: width === 390 ? 844 : 900,
        deviceScaleFactor: 1,
      });
      await applyJwtCookie(page, jwt, cookieDomain);

      const pages = [
        { key: "home", url: `${base}/` },
        { key: "plp", url: `${base}/vin` },
        { key: "pdp", url: `${base}/produkt/${PRODUCT_HANDLE}` },
      ];

      for (const p of pages) {
        const res = await page.goto(p.url, {
          waitUntil: "networkidle2",
          timeout: 180000,
        });
        console.log(brand, p.key, width, res?.status());
        await new Promise((r) => setTimeout(r, 2000));
        await assertBranding(page, `${brand}/${p.key}@${width}`, expectDirty);
        await assertPrices(page, `${brand}/${p.key}@${width}`);
        if (p.key === "home") {
          await assertLoggedOutChrome(page, `${brand}/home@${width}`, {
            // Dirty Wine home is inquiry-first; profile/login copy is not always in first paint.
            requireLoginCopy: !expectDirty,
          });
        }
        await shot(page, `${brand}-${p.key}-${width}`);
      }

      // Cart on PDP after add
      const added = await addBottleViaApi(page);
      logCheck(`${brand}/cart-api@${width}`, Boolean(added?.ok), added);
      await openCart(page);
      const cartText = await pageText(page);
      const linePriceOk = expectDirty
        ? typeof added?.b2bPriceExclVat === "number" &&
          added.b2bPriceExclVat > 0 &&
          !/Lager\s*0\s*kr/i.test(cartText) &&
          !/Totalt\s*0\s*kr/i.test(cartText)
        : /\b([1-9]\d{1,3})\s*kr\b/i.test(cartText) &&
          !/Totalt\s*0\s*kr/i.test(cartText);
      logCheck(`${brand}/open-cart@${width}: non-zero price`, linePriceOk, {
        b2bPriceExclVat: added?.b2bPriceExclVat,
        sample: cartText.match(/\b\d+\s*kr\b/gi)?.slice(0, 8),
        snippet: cartText.slice(0, 280),
      });
      await shot(page, `${brand}-cart-${width}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

const jwt = await bootstrapShareCookie();
console.log("got _vercel_jwt");

const proxy = await startDirtywineProxy(jwt);
console.log(`Dirty Wine proxy on http://dirtywine.se:${PROXY_PORT}`);

try {
  await runHostPass({
    brand: "pact",
    base: PREVIEW_BASE,
    jwt,
    cookieDomain: previewUrl.hostname,
    expectDirty: false,
  });

  await runHostPass({
    brand: "dirtywine",
    base: `http://dirtywine.se:${PROXY_PORT}`,
    jwt,
    cookieDomain: "dirtywine.se",
    expectDirty: true,
  });
} finally {
  proxy.close();
}

fs.writeFileSync(
  path.join(OUT, "verify-report.json"),
  JSON.stringify(report, null, 2),
);

if (report.failures.length) {
  console.error("Verification failures:", report.failures);
  process.exit(1);
}

console.log("All verification checks passed");
