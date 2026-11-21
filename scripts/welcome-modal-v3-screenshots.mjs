/**
 * Welcome modal v3 (kort-v2) screenshots → /opt/cursor/artifacts/welcome-v3/
 * Requires Next on :3000. Flag not needed for /dev/welcome-modal harness.
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT = "/opt/cursor/artifacts/welcome-v3";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.WELCOME_SHOT_BASE || "http://127.0.0.1:3000";
const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function hideDevNoise(page) {
  await page.addStyleTag({
    content: `
      [data-nextjs-toast],[data-next-badge-root],nextjs-portal,#__next-build-watcher,
      [aria-label*="Issues"],button[aria-label*="issues" i]{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }
    `,
  });
}

async function shotModal({ file, qs, width, expectTitle, expectText, expectNotText }) {
  const height = width === 390 ? 844 : 900;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("__nextjs-dev-indicator", "false");
    } catch {}
  });
  const url = `${BASE}/dev/welcome-modal?${qs}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(
    (title) => {
      const h2 = document.querySelector("h2");
      return h2 && h2.textContent.trim() === title;
    },
    { timeout: 60000 },
    expectTitle,
  );
  await hideDevNoise(page);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 700));

  const dots = await page.$eval(
    "[data-testid=welcome-modal-dots]",
    (el) => Number(el.getAttribute("data-dot-count")),
  );
  if (dots !== 3) throw new Error(`${file}: expected 3 dots, got ${dots}`);

  const body = await page.evaluate(() => document.body.innerText);
  for (const t of expectText || []) {
    if (!body.includes(t)) throw new Error(`${file}: missing "${t}"`);
  }
  for (const t of expectNotText || []) {
    if (body.includes(t)) throw new Error(`${file}: unexpected "${t}"`);
  }

  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file);
}

async function shotPdpNoModal({ file, width }) {
  const height = width === 390 ? 844 : 900;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  // Force flag on in page context won't affect SSR; still assert no modal node.
  await page.goto(`${BASE}/vin`, { waitUntil: "domcontentloaded", timeout: 120000 });
  // Prefer a product link if present
  const href = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/produkt/"], a[href^="/product/"]');
    return a ? a.getAttribute("href") : null;
  });
  const target = href ? `${BASE}${href}` : `${BASE}/produkt/does-not-exist-welcome-v3`;
  await page.goto(target, { waitUntil: "domcontentloaded", timeout: 120000 });
  await hideDevNoise(page);
  await new Promise((r) => setTimeout(r, 800));
  const hasModal = await page.$("[data-testid=welcome-modal]");
  if (hasModal) throw new Error(`${file}: welcome modal unexpectedly present on PDP`);
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file, "pdp=", target);
}

try {
  const locales = [
    {
      locale: "sv",
      titles: ["Välkommen till PACT", "Så fungerar det", "Du är medlem"],
      card3: "leverantör",
      notCard3: ["per producent", "per grossist"],
    },
    {
      locale: "en",
      titles: ["Welcome to PACT", "How it works", "You're a member"],
      card3: "supplier",
      notCard3: ["per producer", "wholesaler"],
    },
  ];

  for (const { locale, titles, card3, notCard3 } of locales) {
    for (const width of [390, 1440]) {
      for (let step = 1; step <= 3; step++) {
        const levelLabel = locale === "sv" ? "Brons" : "Bronze";
        const expectText =
          step === 2
            ? [card3]
            : step === 3
              ? [titles[2], levelLabel]
              : [titles[0]];
        const expectNotText = step === 2 ? notCard3 : [];
        await shotModal({
          file: `step${step}-${locale}-w${width}.png`,
          qs: `locale=${locale}&theme=light&stepId=${step}&tier=brons&earning=1`,
          width,
          expectTitle: titles[step - 1],
          expectText,
          expectNotText,
        });
      }
    }
  }

  await shotPdpNoModal({ file: "pdp-no-modal-w390.png", width: 390 });

  fs.writeFileSync(
    path.join(OUT, "notes.md"),
    [
      `# Welcome modal v3 screenshots`,
      ``,
      `- Head SHA: \`${sha}\``,
      `- Copy: kort-v2 (ecd056b1…) + Margaux final card3 leverantör/supplier`,
      `- Flag: \`NEXT_PUBLIC_WELCOME_MODAL_ENABLED\` / \`WELCOME_MODAL_ENABLED\` (default OFF)`,
      `- Seen store: \`profiles.onboarding_seen\` via \`/api/user/onboarding-seen\` + localStorage \`pact_welcome_seen:<userId>\``,
      `- Steps: 1 Välkommen, 2 Så fungerar det (3 cards), 3 Du är medlem`,
      `- Harness: \`/dev/welcome-modal\` (not production)`,
      `- PDP proof: \`pdp-no-modal-w390.png\` — no \`[data-testid=welcome-modal]\``,
      ``,
    ].join("\n"),
  );
  console.log("notes.md written, sha", sha);
} finally {
  await browser.close();
}
