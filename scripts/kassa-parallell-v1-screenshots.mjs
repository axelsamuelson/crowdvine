/**
 * Evidence: checkout does not hang on skeleton when cart/profile are slow/fail.
 * artifacts/kassa-parallell/v1/ — never commit.
 *
 * TEST only — msdfjrrokcmjifetuwgc. Guest + synthetic password user (no auth emails).
 *
 * APP_URL=http://127.0.0.1:3000 node scripts/kassa-parallell-v1-screenshots.mjs
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.APP_URL || "http://127.0.0.1:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-parallell", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-parallell/v1";
const OUT_WALK = "/opt/cursor/artifacts";
for (const d of [OUT_REPO, OUT_OPT]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<Record<string, unknown>>} */
const manifestRows = [];

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url.includes("msdfjrrokcmjifetuwgc") || !key) {
    throw new Error("Refusing: missing TEST admin credentials");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  await page.waitForTimeout(400);
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const walk = join(OUT_WALK, `kassa_parallell_${name}`);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, fullPage: false });
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  manifestRows.push({
    file: name,
    md5,
    bytes: buf.length,
    captured_at,
    head_sha: HEAD,
    branch: BRANCH,
    ...meta,
  });
  console.log("shot", name, md5.slice(0, 8));
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) {
    throw new Error(`cart seed failed: ${res.status()} ${await res.text()}`);
  }
  await page.close();
}

async function createSyntheticUser() {
  const admin = adminClient();
  const email = `kassa.parallell.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kassa Parallell Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");
  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Kassa Parallell Syntetisk",
    phone: "0701234567",
  });
  return { email, password, userId };
}

/**
 * @param {import('playwright').BrowserContext} context
 * @param {'normal'|'slow'|'error'} mode
 */
async function installCartRoute(context, mode) {
  await context.route("**/api/crowdvine/cart**", async (route) => {
    if (mode === "slow") {
      await new Promise((r) => setTimeout(r, 10_000));
      await route.continue();
      return;
    }
    if (mode === "error") {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "simulated" }),
      });
      return;
    }
    await route.continue();
  });
  await context.route("**/api/user/profile**", async (route) => {
    if (mode === "slow") {
      await new Promise((r) => setTimeout(r, 10_000));
    }
    if (mode === "error") {
      // Profile can fail; checkout must still leave skeleton.
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "simulated" }),
      });
      return;
    }
    await route.continue();
  });
}

async function waitCheckoutSettled(page, mode) {
  // Skeleton must clear within timeout budget (~8s) + buffer; slow injects 10s
  // so we allow ~20s for abort path / soft fail.
  const timeout = mode === "slow" ? 25_000 : 60_000;
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    null,
    { timeout },
  );
}

async function runCase(browser, { width, mode, user }) {
  const height = width === 390 ? 900 : 1000;
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "sv-SE",
  });
  await installCartRoute(context, mode);
  await seedCart(context);

  const page = await context.newPage();
  page.setDefaultTimeout(90_000);

  if (user?.email) {
    // Password sign-in via local API — no auth emails.
    const res = await page.request.post(`${BASE}/api/auth/login`, {
      data: { email: user.email, password: user.password },
    });
    if (!res.ok()) {
      throw new Error(`login ${res.status()} ${await res.text()}`);
    }
  }

  const started = Date.now();
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitCheckoutSettled(page, mode);
  const settleMs = Date.now() - started;

  const loadingGone = await page.evaluate(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
  );
  if (!loadingGone) throw new Error("Skeleton still present");

  const tag = user ? "loggedin" : "guest";
  const name = `checkout-${tag}-${mode}-${width}.png`;
  await shot(page, name, {
    route: "/checkout",
    viewport: { width, height },
    mode,
    user: tag,
    settle_ms: settleMs,
    notes:
      mode === "slow"
        ? "10s injected delay; skeleton cleared via AbortSignal timeout"
        : mode === "error"
          ? "503 cart/profile; checkout left skeleton with error/empty UI"
          : "Normal path",
  });

  await context.close();
}

async function main() {
  requireTestEnv();
  const browser = await chromium.launch({ headless: true });
  const synth = await createSyntheticUser();
  console.log("synthetic_user", synth.email);

  try {
    for (const width of [390, 1440]) {
      for (const mode of ["normal", "slow", "error"]) {
        await runCase(browser, { width, mode, user: null });
        await runCase(browser, { width, mode, user: synth });
      }
    }
  } finally {
    await browser.close();
  }

  const manifest = {
    head_sha: HEAD,
    branch: BRANCH,
    captured_at: new Date().toISOString(),
    supabase_ref: "msdfjrrokcmjifetuwgc",
    note: "Guest + synthetic password user. Modes: normal / slow(10s) / error(503). No auth emails.",
    files: manifestRows,
  };
  for (const dir of [OUT_REPO, OUT_OPT]) {
    writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    writeFileSync(join(dir, "head_sha"), `${HEAD}\n`);
  }
  console.log(JSON.stringify({ head_sha: HEAD, count: manifestRows.length }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
