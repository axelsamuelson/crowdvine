/**
 * Welcome modal v4 — design-review retakes → /opt/cursor/artifacts/welcome-v4/
 * Requires Next on :3000 with NEXT_PUBLIC_WELCOME_MODAL_ENABLED=true.
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT = "/opt/cursor/artifacts/welcome-v4";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.WELCOME_SHOT_BASE || "http://127.0.0.1:3000";
const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const PDP_SV = process.env.WELCOME_SHOT_PDP_SV || "/produkt/la-souteronne-2025";
const PDP_EN = process.env.WELCOME_SHOT_PDP_EN || "/product/la-souteronne-2025";

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

async function prepGate(page, { seen = false } = {}) {
  await page.evaluateOnNewDocument((seenFlag) => {
    try {
      localStorage.setItem("__nextjs-dev-indicator", "false");
      localStorage.setItem(
        "__welcome_gate_sim",
        JSON.stringify({
          userId: "welcome-v4-sim",
          member: true,
          seen: seenFlag,
        }),
      );
      localStorage.removeItem("pact_welcome_seen:welcome-v4-sim");
    } catch {}
  }, seen);
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
  await page.goto(`${BASE}/dev/welcome-modal?${qs}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
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

async function shotRoute({ file, route, width, expectModal, openCart = false }) {
  const height = width === 390 ? 844 : 900;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await prepGate(page, { seen: false });
  await page.goto(`${BASE}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await hideDevNoise(page);
  await new Promise((r) => setTimeout(r, 1500));

  if (expectModal) {
    await page.waitForSelector("[data-testid=welcome-modal]", {
      timeout: 15000,
    });
  }

  if (openCart) {
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("cart-open-request"));
    });
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Varukorg") ||
        document.body.innerText.includes("Cart"),
      { timeout: 10000 },
    );
    await new Promise((r) => setTimeout(r, 400));
  }

  const hasModal = await page.$("[data-testid=welcome-modal]");
  if (expectModal && !hasModal) {
    throw new Error(`${file}: expected welcome modal on ${route}`);
  }
  if (!expectModal && hasModal) {
    throw new Error(`${file}: welcome modal unexpectedly on ${route}`);
  }

  // Assert page is not a Next 404 for PDP shots
  const text = await page.evaluate(() => document.body.innerText);
  if (route.includes("/produkt/") || route.includes("/product/")) {
    if (
      /\b404\b|Sidan hittades inte|This page could not be found/i.test(text) &&
      !/Köp|Buy|kr\b/i.test(text)
    ) {
      throw new Error(`${file}: PDP looks like 404 for ${route}`);
    }
  }

  // Viewport shots for gate proofs (modal/cart/checkout) — avoid giant full-page scrolls
  const useFullPage = false;
  await page.screenshot({
    path: path.join(OUT, file),
    fullPage: useFullPage,
  });
  await page.close();
  console.log("wrote", file, "route=", route, "modal=", Boolean(hasModal));
}

try {
  const locales = [
    {
      locale: "sv",
      titles: ["Välkommen till PACT", "Så fungerar det", "Du är medlem"],
      card3: "producent eller grossist",
      variantTitle: "Välkommen till PACT",
      variantExpect: ["Hantverksvin"],
      variantForbid: ["Naturvin", "naturvin"],
    },
    {
      locale: "en",
      titles: ["Welcome to PACT", "How it works", "You're a member"],
      card3: "producer or wholesaler",
      variantTitle: "Welcome to PACT",
      variantExpect: ["craft wine"],
      variantForbid: ["natural wine", "Natural wine"],
    },
  ];

  for (const L of locales) {
    for (const width of [390, 1440]) {
      for (let step = 1; step <= 3; step++) {
        await shotModal({
          file: `step${step}-${L.locale}-w${width}.png`,
          qs: `locale=${L.locale}&theme=light&stepId=${step}&tier=brons&earning=1`,
          width,
          expectTitle: L.titles[step - 1],
          expectText:
            step === 2
              ? [L.card3]
              : step === 3
                ? [L.titles[2], L.locale === "sv" ? "Brons" : "Bronze"]
                : [L.titles[0]],
        });
      }
      // Variant step 1
      await shotModal({
        file: `step1-${L.locale}-w${width}-hideNatural.png`,
        qs: `locale=${L.locale}&theme=light&stepId=1&tier=brons&earning=1&hideNatural=1`,
        width,
        expectTitle: L.variantTitle,
        expectText: L.variantExpect,
        expectNotText: L.variantForbid,
      });
    }
  }

  // Gate proofs — member unseen, flag on via env
  await shotRoute({
    file: "vin-shows-modal-w390.png",
    route: "/vin",
    width: 390,
    expectModal: true,
  });
  await shotRoute({
    file: "pdp-sv-no-modal-w390.png",
    route: PDP_SV,
    width: 390,
    expectModal: false,
  });
  await shotRoute({
    file: "pdp-en-no-modal-w390.png",
    route: PDP_EN,
    width: 390,
    expectModal: false,
  });
  await shotRoute({
    file: "checkout-no-modal-w390.png",
    route: "/checkout",
    width: 390,
    expectModal: false,
  });
  await shotRoute({
    file: "cart-drawer-no-modal-w390.png",
    route: "/vin",
    width: 390,
    expectModal: false,
    openCart: true,
  });

  fs.writeFileSync(
    path.join(OUT, "notes.md"),
    [
      `# Welcome modal v4 screenshots`,
      ``,
      `- Head SHA: \`${sha}\``,
      `- Copy: kort-v2 sha256 3a51bb47… (card3 producent/grossist)`,
      `- Flag: \`WELCOME_MODAL_ENABLED\` / \`NEXT_PUBLIC_WELCOME_MODAL_ENABLED\` (default OFF; forced on for these shots)`,
      `- Seen: \`profiles.onboarding_seen\` + \`pact_welcome_seen:<userId>\``,
      `- Gate sim (dev only): localStorage \`__welcome_gate_sim\` for member/unseen screenshots`,
      `- Cart: drawer via \`cart-open-request\` (no /varukorg|/kassa routes; checkout is \`/checkout\`)`,
      `- PDP: \`${PDP_SV}\` / \`${PDP_EN}\``,
      `- Content variant: auth \`content_variant\` / \`hide_natural_wine\` metadata → hantverksvin / craft wine`,
      ``,
    ].join("\n"),
  );
  console.log("notes written", sha);
} finally {
  await browser.close();
}
