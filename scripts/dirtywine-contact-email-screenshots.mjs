/**
 * Capture Dirty Wine footer + open menu showing hello@dirtywine.se.
 * Requires Next on :3000 and /etc/hosts dirtywine.se → 127.0.0.1
 *
 * Usage: node scripts/dirtywine-contact-email-screenshots.mjs
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("docs/design-review/dirtywine-contact-email");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://dirtywine.se:3000";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function prepare(page) {
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("__nextjs-dev-indicator", "false");
    } catch {}
  });
}

async function waitReady(page) {
  await page.waitForSelector("header", { timeout: 60000 });
  await page.waitForSelector("footer", { timeout: 60000 });
  await page.addStyleTag({
    content: `
      [data-nextjs-toast],
      [data-next-badge-root],
      nextjs-portal,
      #__next-build-watcher,
      [aria-label*="Issues"],
      button[aria-label*="issues" i] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `,
  });
  await page
    .waitForFunction(
      () => !!document.querySelector("header img, footer img, header svg"),
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function assertFooterChrome(page, where) {
  const footerText = await page.$eval("footer", (el) => el.innerText);
  if (!footerText.includes("hello@dirtywine.se")) {
    throw new Error(`Missing hello@dirtywine.se in ${where}`);
  }
  if (!footerText.includes("Hjälp")) {
    throw new Error(`Expected Hjälp in ${where}, got: ${footerText}`);
  }
  if (/Kom igång/i.test(footerText)) {
    throw new Error(`Unexpected Kom igång in ${where}`);
  }
  // mailto + Instagram must share the same computed color (no UA blue on mailto)
  const colors = await page.$$eval("footer a", (anchors) =>
    anchors
      .filter((a) => {
        const href = a.getAttribute("href") || "";
        return href.startsWith("mailto:") || /instagram/i.test(a.textContent || "");
      })
      .map((a) => ({
        href: a.getAttribute("href"),
        color: getComputedStyle(a).color,
        label: (a.textContent || "").trim(),
      })),
  );
  const mail = colors.find((c) => (c.href || "").startsWith("mailto:"));
  const ig = colors.find((c) => /instagram/i.test(c.label));
  if (!mail || !ig) {
    throw new Error(`Missing mailto or Instagram in ${where}: ${JSON.stringify(colors)}`);
  }
  if (mail.color !== ig.color) {
    throw new Error(
      `mailto color ${mail.color} !== Instagram ${ig.color} in ${where}`,
    );
  }
}

async function openMobileMenu(page) {
  await page.addStyleTag({
    content: `
      header button.md\\:hidden,
      header .md\\:hidden {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
    `,
  });
  const opened = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("header button, button")];
    const btn = buttons.find((b) => {
      const label = `${b.textContent || ""} ${b.getAttribute("aria-label") || ""}`;
      return /\bmeny\b|open menu/i.test(label);
    });
    if (!btn) return { ok: false };
    btn.style.display = "inline-flex";
    btn.click();
    return { ok: true };
  });
  if (!opened.ok) throw new Error("Could not find Meny button");
  await page.waitForFunction(
    () => /Stäng/i.test(document.body.innerText),
    { timeout: 10000 },
  );
  await new Promise((r) => setTimeout(r, 700));
}

async function assertStangClear(page, where) {
  const ok = await page.evaluate(() => {
    const stang = [...document.querySelectorAll("button")].find((b) =>
      /stäng|close menu/i.test(
        `${b.textContent || ""} ${b.getAttribute("aria-label") || ""}`,
      ),
    );
    if (!stang) return { ok: false, reason: "no-stang" };
    const sr = stang.getBoundingClientRect();
    // Cart trigger typically contains "(0)" or "Varukorg"
    const cart = [...document.querySelectorAll("button, a")].find((el) =>
      /\(0\)|varukorg|cart/i.test(el.textContent || ""),
    );
    if (!cart) return { ok: true, note: "no-cart" };
    const cr = cart.getBoundingClientRect();
    const overlap = !(
      sr.right <= cr.left ||
      sr.left >= cr.right ||
      sr.bottom <= cr.top ||
      sr.top >= cr.bottom
    );
    // Stäng must be on top: elementFromPoint at Stäng center should be Stäng (or child)
    const cx = sr.left + sr.width / 2;
    const cy = sr.top + sr.height / 2;
    const topEl = document.elementFromPoint(cx, cy);
    const stangOnTop = !!(topEl && (stang === topEl || stang.contains(topEl)));
    // Spatial overlap with the cart slot is OK if Stäng wins the hit-test
    // (menu panel stacks above header). Covering Stäng visually was the bug.
    return {
      ok: stangOnTop,
      overlap,
      stangOnTop,
      stang: { x: sr.x, y: sr.y, w: sr.width, h: sr.height },
      cart: { x: cr.x, y: cr.y, w: cr.width, h: cr.height },
      topTag: topEl?.tagName,
      topText: topEl?.textContent?.slice(0, 40),
    };
  });
  if (!ok.ok) {
    throw new Error(`Stäng not clear of cart in ${where}: ${JSON.stringify(ok)}`);
  }
  console.log("stang", where, JSON.stringify(ok));
}

try {
  for (const width of [390, 1440]) {
    const height = width === 390 ? 844 : 900;
    {
      const page = await browser.newPage();
      await prepare(page);
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      const res = await page.goto(`${BASE}/`, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      console.log("footer", width, res?.status());
      await waitReady(page);
      await assertFooterChrome(page, `footer-${width}`);
      await page.evaluate(() => {
        document.querySelector("footer")?.scrollIntoView({ block: "end" });
      });
      await new Promise((r) => setTimeout(r, 400));
      const footer = await page.$("footer");
      await footer.screenshot({
        path: path.join(OUT, `after-footer-${width}.png`),
      });
      console.log("wrote", `after-footer-${width}.png`);
      await page.close();
    }

    {
      const page = await browser.newPage();
      await prepare(page);
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${BASE}/`, {
        waitUntil: "networkidle2",
        timeout: 120000,
      });
      await waitReady(page);
      await openMobileMenu(page);
      await assertStangClear(page, `menu-${width}`);
      await page.screenshot({
        path: path.join(OUT, `after-menu-${width}.png`),
        fullPage: false,
      });
      console.log("wrote", `after-menu-${width}.png`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
