/**
 * Welcome modal v5 — orphan wrap + logged-in checkout gate → /opt/cursor/artifacts/welcome-v5/
 * Requires Next on :3000 with WELCOME_MODAL_ENABLED=true and real Supabase.
 *
 * Env (optional): WELCOME_V5_EMAIL / WELCOME_V5_PASSWORD — member with onboarding_seen=false
 * Or reads /tmp/welcome-v5-creds.json
 */
import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OUT = "/opt/cursor/artifacts/welcome-v5";
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
  if (!fs.existsSync(p)) {
    throw new Error("Missing WELCOME_V5_EMAIL/PASSWORD or /tmp/welcome-v5-creds.json");
  }
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
    content: `
      [data-nextjs-toast],[data-next-badge-root],nextjs-portal,#__next-build-watcher,
      [aria-label*="Issues"],button[aria-label*="issues" i]{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }
    `,
  });
}

async function shotStep1(locale) {
  const file = `step1-${locale}-w390.png`;
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.goto(
    `${BASE}/dev/welcome-modal?locale=${locale}&theme=light&stepId=1&tier=brons&earning=1`,
    { waitUntil: "domcontentloaded", timeout: 120000 },
  );
  await page.waitForFunction(
    (title) => document.querySelector("h2")?.textContent?.trim() === title,
    { timeout: 60000 },
    locale === "sv" ? "Välkommen till PACT" : "Welcome to PACT",
  );
  await hideDevNoise(page);
  await new Promise((r) => setTimeout(r, 600));
  const body = await page.evaluate(() => document.body.innerText);
  const orphan = locale === "sv" ? "pallar" : "pallets";
  // Soft check: subtitle should include the word; layout proof is visual.
  if (!body.includes(orphan)) {
    throw new Error(`${file}: missing subtitle word "${orphan}"`);
  }
  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file);
}

async function loginAndShotCheckout(creds) {
  const file = "checkout-member-unseen-no-modal-w390.png";
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  // Need an origin before fetch can set cookies.
  await page.goto(`${BASE}/log-in`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  // Login via API so Set-Cookie is applied in this browser context.
  const login = await page.evaluate(async (email, password, base) => {
    const res = await fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  }, creds.email, creds.password, BASE);

  if (!login.ok) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.json)}`);
  }
  console.log("logged in as", login.json?.user?.email || creds.email);

  // Ensure local seen flag is clear for this user id
  const userId = login.json?.user?.id;
  if (userId) {
    await page.evaluate((uid) => {
      try {
        localStorage.removeItem(`pact_welcome_seen:${uid}`);
      } catch {}
    }, userId);
  }

  await page.goto(`${BASE}/checkout`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await new Promise((r) => setTimeout(r, 2000));
  await hideDevNoise(page);

  const info = await page.evaluate(() => ({
    path: location.pathname,
    modal: Boolean(document.querySelector("[data-testid=welcome-modal]")),
    title: document.title,
    text: document.body.innerText.slice(0, 400),
  }));
  console.log("checkout info", JSON.stringify({ ...info, text: info.text.slice(0, 120) }));

  if (info.path.includes("access-request")) {
    throw new Error(`${file}: still on access-request — session/membership gate failed`);
  }
  if (info.modal) {
    throw new Error(`${file}: welcome modal unexpectedly present on /checkout`);
  }

  await page.screenshot({ path: path.join(OUT, file), fullPage: false });
  await page.close();
  console.log("wrote", file);
}

try {
  const creds = loadCreds();
  await shotStep1("sv");
  await shotStep1("en");
  await loginAndShotCheckout(creds);

  fs.writeFileSync(
    path.join(OUT, "notes.md"),
    [
      `# Welcome modal v5 screenshots`,
      ``,
      `- Head SHA: \`${sha}\``,
      `- Step 1 subtitle: \`max-w-md mx-auto text-balance\` (same max-width as body; no orphan "pallar"/"pallets")`,
      `- Checkout shot: logged-in basic member, \`onboarding_seen=false\`, flag ON, 390 SV — modal absent`,
      `- Members-only gate: \`mayRenderModal = flagOn && Boolean(userId) && isMember\` in \`onboarding-provider.tsx\``,
      ``,
    ].join("\n"),
  );
  console.log("notes written", sha);
} finally {
  await browser.close();
}
