/**
 * Evidence: fraktpriser efter postnummer (innan adress).
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod. Never commit.
 *
 * APP_URL=http://localhost:3000 node scripts/kassa-frakt-postnummer-v1-screenshots.mjs
 *
 * Output: /opt/cursor/artifacts/kassa-frakt-postnummer/v1/ + repo artifacts/ + store
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

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
}
loadEnvLocal();

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const STOCKHOLM_GEO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-frakt-postnummer", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-frakt-postnummer/v1";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-frakt-postnummer/v1";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<Record<string, string | number>>} */
const manifestRows = [];

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
  const pk =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY ||
    "";
  if (pk && !pk.startsWith("pk_test")) {
    throw new Error("Refusing: Stripe publishable key is not test mode");
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing supabase env");
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  const bytes = statSync(join(OUT_REPO, name)).size;
  manifestRows.push({
    file: name,
    case: meta.case,
    user: meta.user,
    postal: meta.postal,
    viewport: meta.viewport,
    captured_at,
    notes: meta.notes,
    md5,
    bytes,
  });
  console.log("shot", name, md5.slice(0, 8), bytes);
}

async function seedCart(context) {
  const page = await context.newPage();
  // Clear twice — logged-in carts sometimes retain lines after one clear.
  await page.request.post(`${BASE}/api/cart/clear`).catch(() => {});
  await page.request.post(`${BASE}/api/cart/clear`).catch(() => {});
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) throw new Error(`batch-add ${res.status()} ${await res.text()}`);
  await page.close();
}

async function waitNoCartLoading(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    undefined,
    { timeout: 90000 },
  );
}

/**
 * Enter postal and wait for shipping prices — must NOT require address fields.
 */
async function enterPostalAndWaitPrices(page, postal) {
  const input = page.locator("#checkout-postal");
  if (await input.isVisible().catch(() => false)) {
    await input.fill("");
    await input.fill(postal);
    await page.keyboard.press("Tab");
  } else {
    const change = page.getByRole("button", { name: /Ändra|Edit|Change/i }).first();
    if (await change.isVisible().catch(() => false)) {
      await change.click();
      await page.waitForTimeout(400);
      await page.locator("#checkout-postal").fill("");
      await page.locator("#checkout-postal").fill(postal);
      await page.keyboard.press("Tab");
    }
  }

  // Assert address fields still empty / not required for prices.
  const streetVisible = await page
    .locator("#checkout-street")
    .isVisible()
    .catch(() => false);
  if (streetVisible) {
    const streetVal = await page.locator("#checkout-street").inputValue();
    if (streetVal && streetVal.trim().length > 1) {
      // Logged-in may have saved address — OK, but note it.
      console.log("note: street already filled (saved profile)");
    }
  }

  // Wait for prices AND zone spinner gone — never shoot while hung.
  await page.waitForFunction(
    ({ postalNeedle, expectSharedUnavailable }) => {
      const t = document.body?.innerText || "";
      if (!new RegExp(postalNeedle).test(t)) return false;
      const updating = /Uppdaterar leverans/i.test(t);
      const zoneSpinner = Boolean(
        document.querySelector('[data-testid="checkout-zone-loading"]'),
      );
      const hasSharedPrice = /99\s*kr/i.test(t) && /Delad pall/i.test(t);
      const hasDirectPrice =
        (/149\s*kr/i.test(t) || /per låda/i.test(t)) && /Direktleverans/i.test(t);
      const sharedUnavailable =
        /Delad pall/i.test(t) &&
        (/inte tillgänglig/i.test(t) || /utanför leveranszonen/i.test(t));
      const previewRetry = Boolean(
        document.querySelector('[data-testid="checkout-shipping-preview-retry"]'),
      );
      const zoneRetry = Boolean(
        document.querySelector('[data-testid="checkout-zone-timeout"]'),
      );
      if (previewRetry || zoneRetry) return !updating && !zoneSpinner;
      if (updating || zoneSpinner) return false;
      if (expectSharedUnavailable) {
        return sharedUnavailable && hasDirectPrice;
      }
      return hasSharedPrice && hasDirectPrice;
    },
    {
      postalNeedle: postal,
      expectSharedUnavailable: postal === "98131",
    },
    { timeout: 25000 },
  );
}

async function seedLoggedIn(postal) {
  const admin = adminClient();
  const email = `kassa.frakt.v1.${postal}.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const city = postal === "98131" ? "Kiruna" : "Stockholm";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Frakt V1 ${city}` },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("no user");
  // Postal only on profile — leave street empty so screenshots prove
  // prices appear before address fields are filled.
  // Leave contact/address empty — prices must show from postal alone.
  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: null,
    phone: null,
    address: null,
    city: null,
    postal_code: null,
    country: "SE",
  });
  await admin.from("user_zone_preferences").upsert(
    {
      user_id: userId,
      active_geo_zone_id: STOCKHOLM_GEO,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  return { email, password, userId, postal };
}

async function login(page, email, password) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login ${res.status()} ${await res.text()}`);
}

async function runCase({ label, viewport, userKind, postal, creds }) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  if (userKind === "logged_in") {
    await login(page, creds.email, creds.password);
  }
  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await enterPostalAndWaitPrices(page, postal);

  // Confirm address street is not filled (anon / postal-only logged-in).
  const streetFilled = await page.evaluate(() => {
    const el = document.querySelector("#checkout-street");
    return Boolean(el && String(el.value || "").trim().length > 1);
  });
  if (streetFilled) {
    throw new Error(`${label}: street filled before shot — prices must show pre-address`);
  }

  const userLabel =
    userKind === "anonymous"
      ? "anonymous"
      : `synthetic:${creds.email}`;

  await shot(page, `${label}-${postal}-${userKind}.png`, {
    case: `${userKind}_${postal}_after_postal_before_address`,
    user: userLabel,
    postal,
    viewport: `${viewport.width}x${viewport.height}`,
    notes: "Prices after postal only; address fields empty",
  });

  const body = await page.innerText("body");
  if (/Uppdaterar leverans/i.test(body)) {
    console.warn("warn: Uppdaterar leverans still visible at shot time", label);
  }

  await browser.close();
}

async function main() {
  requireTestEnv();
  console.log("head", HEAD, "branch", BRANCH, "base", BASE);

  const viewports = [
    { label: "390", width: 390, height: 844 },
    { label: "1440", width: 1440, height: 900 },
  ];
  const postals = ["11151", "98131"];

  // One synthetic user per postal (postal not pre-filled on profile).
  const credsByPostal = {
    11151: await seedLoggedIn("11151"),
    98131: await seedLoggedIn("98131"),
  };

  for (const vp of viewports) {
    for (const postal of postals) {
      await runCase({
        label: vp.label,
        viewport: { width: vp.width, height: vp.height },
        userKind: "anonymous",
        postal,
        creds: null,
      });
      await runCase({
        label: vp.label,
        viewport: { width: vp.width, height: vp.height },
        userKind: "logged_in",
        postal,
        creds: credsByPostal[postal],
      });
    }
  }

  const manifest = [
    `head_sha=${HEAD}`,
    `branch=${BRANCH}`,
    `test_project=msdfjrrokcmjifetuwgc`,
    `captured_at=${new Date().toISOString()}`,
    `cases=anonymous+logged_in × 11151+98131 × 390+1440`,
    `note=screenshots immediately after postal, before address`,
    "",
    ...manifestRows.map((r) =>
      [
        r.file,
        `case=${r.case}`,
        `user=${r.user}`,
        `postal=${r.postal}`,
        `viewport=${r.viewport}`,
        `md5=${r.md5}`,
        `bytes=${r.bytes}`,
        `at=${r.captured_at}`,
        `notes=${r.notes}`,
      ].join(" | "),
    ),
  ].join("\n");

  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    writeFileSync(join(dir, "manifest.txt"), manifest + "\n");
  }
  console.log("manifest written", manifestRows.length, "shots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
