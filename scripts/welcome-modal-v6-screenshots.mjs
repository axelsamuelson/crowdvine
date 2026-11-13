/**
 * Welcome modal v6 — fully rendered SV checkout (no modal) + control (modal on).
 * → /opt/cursor/artifacts/welcome-v6/
 *
 * Creds: WELCOME_V5_EMAIL/PASSWORD or /tmp/welcome-v5-creds.json
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT = "/opt/cursor/artifacts/welcome-v6";
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.WELCOME_SHOT_BASE || "http://127.0.0.1:3000";
const sha = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();

function loadCreds() {
  if (process.env.WELCOME_V5_EMAIL && process.env.WELCOME_V5_PASSWORD) {
    return {
      email: process.env.WELCOME_V5_EMAIL,
      password: process.env.WELCOME_V5_PASSWORD,
    };
  }
  const p = "/tmp/welcome-v5-creds.json";
  if (!fs.existsSync(p)) throw new Error("Missing welcome-v5 creds");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function hideDevNoise(page) {
  await page.addStyleTag({
    content: `[data-nextjs-toast],[data-next-badge-root],nextjs-portal,#__next-build-watcher,[aria-label*="Issues"]{display:none!important;visibility:hidden!important;opacity:0!important}`,
  });
}

async function login(page, creds) {
  await page.goto(`${BASE}/log-in`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  // Force SV locale cookie if the app uses one
  await page.evaluate(() => {
    try {
      document.cookie = "NEXT_LOCALE=sv; path=/";
      document.cookie = "locale=sv; path=/";
    } catch {}
  });
  const login = await page.evaluate(
    async (email, password, base) => {
      const res = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, json };
    },
    creds.email,
    creds.password,
    BASE,
  );
  if (!login.ok) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.json)}`);
  }
  const userId = login.json?.user?.id;
  if (userId) {
    await page.evaluate((uid) => {
      try {
        localStorage.removeItem(`pact_welcome_seen:${uid}`);
      } catch {}
    }, userId);
  }
  return login.json?.user;
}

async function shotCheckout(creds, width) {
  const file = `checkout-member-unseen-no-modal-sv-w${width}.png`;
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height: width === 390 ? 844 : 900,
    deviceScaleFactor: 1,
  });
  await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9" });
  const user = await login(page, creds);
  console.log("checkout login", user?.email);

  await page.goto(`${BASE}/checkout`, {
    waitUntil: "networkidle0",
    timeout: 180000,
  });
  // Wait until loading skeleton is gone and SV empty-cart (or form) is up.
  await page.waitForFunction(
    () => {
      if (document.querySelector("[data-testid=checkout-cart-loading]")) {
        return false;
      }
      const t = document.body.innerText;
      // SV empty cart OR payment/delivery form signals
      return (
        t.includes("Tillbaka till varukorgen") ||
        t.includes("Din varukorg är tom") ||
        t.includes("Kassan") ||
        t.includes("Betalkort") ||
        t.includes("Leveransadress") ||
        t.includes("Postnummer") ||
        Boolean(document.querySelector("[data-testid=stripe-payment-section]"))
      );
    },
    { timeout: 120000 },
  );
  await new Promise((r) => setTimeout(r, 3000));
  await hideDevNoise(page);

  const info = await page.evaluate(() => ({
    path: location.pathname,
    modal: Boolean(document.querySelector("[data-testid=welcome-modal]")),
    loading: Boolean(
      document.querySelector("[data-testid=checkout-cart-loading]"),
    ),
    text: document.body.innerText.slice(0, 500),
    hasBackEn: document.body.innerText.includes("Back to cart"),
    hasBackSv: document.body.innerText.includes("Tillbaka till varukorgen"),
    hasEmptySv: document.body.innerText.includes("Din varukorg är tom"),
  }));
  console.log("checkout", width, JSON.stringify({ ...info, text: info.text.slice(0, 160) }));

  if (info.path.includes("access-request")) {
    throw new Error(`${file}: redirected to access-request`);
  }
  if (info.loading) throw new Error(`${file}: still showing loading skeleton`);
  if (info.modal) throw new Error(`${file}: welcome modal present on /checkout`);
  if (info.hasBackEn && !info.hasBackSv && !info.hasEmptySv) {
    throw new Error(`${file}: page still English — expected SV copy`);
  }

  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file);
}

async function shotControlModal(creds, width) {
  const file = `vin-member-unseen-shows-modal-sv-w${width}.png`;
  const page = await browser.newPage();
  await page.setViewport({
    width,
    height: width === 390 ? 844 : 900,
    deviceScaleFactor: 1,
  });
  await page.setExtraHTTPHeaders({ "Accept-Language": "sv-SE,sv;q=0.9" });
  await login(page, creds);

  await page.goto(`${BASE}/vin`, {
    waitUntil: "networkidle0",
    timeout: 180000,
  });
  await page.waitForSelector("[data-testid=welcome-modal]", { timeout: 60000 });
  await page.waitForFunction(
    () =>
      document.querySelector("[data-testid=welcome-modal] h2")?.textContent?.trim() ===
      "Välkommen till PACT",
    { timeout: 30000 },
  );
  await new Promise((r) => setTimeout(r, 800));
  await hideDevNoise(page);

  const info = await page.evaluate(() => ({
    path: location.pathname,
    title: document.querySelector("[data-testid=welcome-modal] h2")?.textContent,
  }));
  console.log("control", width, info);
  if (info.path !== "/vin") throw new Error(`${file}: expected /vin`);

  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file);
}

try {
  const creds = loadCreds();
  // Control first (modal show), then checkout (modal absent) — separate sessions
  // so openedOnce on /vin doesn't affect checkout proof.
  for (const width of [390, 1440]) {
    await shotControlModal(creds, width);
  }
  for (const width of [390, 1440]) {
    await shotCheckout(creds, width);
  }

  fs.writeFileSync(
    path.join(OUT, "notes.md"),
    [
      `# Welcome modal v6 screenshots`,
      ``,
      `- Head SHA: \`${sha}\``,
      `- Member: logged-in basic, \`onboarding_seen=false\`, flag ON, locale SV`,
      `- Control: \`/vin\` shows welcome modal (390 + 1440)`,
      `- Checkout: wait until \`[data-testid=checkout-cart-loading]\` gone + networkidle + 3s; modal absent (390 + 1440)`,
      `- Gate: auto-open only when \`isWelcomeModalAllowedPath\` — \`/\`, \`/en\`, \`/vin\`, \`/wine\` (see \`lib/onboarding/welcome-modal-routes.ts\`). \`/checkout\` is not allowlisted (also listed in \`isWelcomeCheckoutPath\` / \`isWelcomeModalBlockedPath\`).`,
      ``,
    ].join("\n"),
  );
  console.log("notes written", sha);
} finally {
  await browser.close();
}
