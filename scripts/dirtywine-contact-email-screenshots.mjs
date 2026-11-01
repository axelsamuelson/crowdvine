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
  // Hide Next.js / tooling overlays that cover contact links.
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
  // Prefer Dirty Wine logo img; fall back after a short wait.
  await page
    .waitForFunction(
      () =>
        !!document.querySelector('header img, footer img, header svg'),
      { timeout: 15000 },
    )
    .catch(() => {});
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 800));
}

async function assertHej(page, where) {
  const text = await page.evaluate(() => document.body.innerText);
  if (!text.includes("hello@dirtywine.se")) {
    throw new Error(`Missing hello@dirtywine.se in ${where}`);
  }
}

async function openMobileMenu(page) {
  // Meny is md:hidden; force it visible for 1440 review shots.
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
    if (!btn) return { ok: false, reason: "no-button" };
    btn.style.display = "inline-flex";
    btn.click();
    return { ok: true, text: btn.textContent };
  });
  if (!opened.ok) throw new Error("Could not find Meny button");
  // Wait for the open panel (Stäng), not footer email which is always present.
  await page.waitForFunction(
    () => /Stäng/i.test(document.body.innerText),
    { timeout: 10000 },
  );
  await page.waitForFunction(
    () => {
      // Menu panel lists Instagram beside the contact email.
      const nodes = [...document.querySelectorAll("a")];
      return nodes.some(
        (a) =>
          a.getAttribute("href") === "mailto:hello@dirtywine.se" &&
          a.offsetParent !== null,
      );
    },
    { timeout: 10000 },
  );
  await new Promise((r) => setTimeout(r, 600));
}

try {
  for (const width of [390, 1440]) {
    const height = width === 390 ? 844 : 900;
    // Footer
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
      await assertHej(page, `footer-${width}`);
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

    // Open menu (with real site header chrome behind / above the panel)
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
      await assertHej(page, `menu-${width}`);
      // Full viewport so Geist header + open menu + hej@ are visible.
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
