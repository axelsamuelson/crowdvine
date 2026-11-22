/**
 * Kassabugg: Delad pall stays disabled for 98131 after guest reload.
 * Exact guest flow: clear storage → guest → 98131 → reload (form restore).
 * artifacts → /opt/cursor/artifacts/kassa-kiruna-pall/v1/ (+ repo + store).
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod. Never commit.
 *
 * APP_URL=http://localhost:3000 node scripts/kassa-kiruna-pall-v1-screenshots.mjs
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

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const STOCKHOLM_GEO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-kiruna-pall", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-kiruna-pall/v1";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-kiruna-pall/v1";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<{file:string, case:string, user:string, captured_at:string, notes:string, md5?:string, bytes?:number}>} */
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
  await page.waitForTimeout(400);
  await waitZoneSettled(page);
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
    captured_at,
    notes: meta.notes,
    md5,
    bytes,
  });
  console.log("shot", name, md5.slice(0, 8), bytes, meta.user);
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) {
    throw new Error(`batch-add ${res.status()} ${await res.text()}`);
  }
  await page.close();
}

async function login(page, email, password) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`login ${res.status()} ${await res.text()}`);
  }
}

async function waitNoCartLoading(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    { timeout: 90000 },
  );
}

async function waitZoneSettled(page) {
  await page
    .waitForFunction(
      () => !/Uppdaterar leverans/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
}

async function clearSiteData(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.context().clearCookies();
}

async function enterPostalOnly(page, postal) {
  await page.waitForSelector("#checkout-postal", { timeout: 45000 });
  await page.fill("#checkout-postal", "");
  await page.fill("#checkout-postal", postal);
  // Input may unmount once hasPostalCode flips — do not blur.
}

async function ensurePostalPresent(page, postal) {
  const body = (await page.locator("body").innerText()) || "";
  if (new RegExp(postal).test(body)) return;
  const inputVisible = await page
    .locator("#checkout-postal")
    .isVisible()
    .catch(() => false);
  if (inputVisible) {
    const v = (await page.inputValue("#checkout-postal")).replace(/\s+/g, "");
    if (v !== postal) {
      await page.fill("#checkout-postal", postal);
    }
    return;
  }
  const change = page.getByRole("button", { name: /Ändra|Byt|Edit|Change/i }).first();
  if (await change.isVisible().catch(() => false)) {
    await change.click();
    await page.waitForTimeout(400);
  }
  await page.waitForSelector("#checkout-postal", { timeout: 20000 });
  await page.fill("#checkout-postal", postal);
}

async function assertOutOfZoneShared(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      if (/99\s*kr[\s\S]{0,40}leverans inom 30 dagar/i.test(t) &&
          /Delad pall[\s\S]{0,120}99/i.test(t) &&
          !/utanför leveranszonen/i.test(t)) {
        return false;
      }
      return /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(
        t,
      );
    },
    { timeout: 90000 },
  );
  const disabled = await page
    .locator('label')
    .filter({ hasText: /Delad pall/i })
    .first()
    .locator("input")
    .isDisabled();
  if (!disabled) {
    throw new Error("Delad pall input should be disabled out of zone");
  }
}

async function assertSharedAvailable(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const out =
        /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
      const sharedOk =
        /Delad pall[\s\S]{0,200}99/i.test(t) &&
        !/Delad pall[\s\S]{0,200}inte tillgänglig/i.test(t);
      return !out && sharedOk;
    },
    { timeout: 90000 },
  );
}

/**
 * Camille exact guest repro: clear site data → guest → 98131 → reload.
 * Playwright does not restore form fields; re-apply postal after reload to
 * mirror Chrome form restoration after a soft reload (postal still present).
 */
async function runGuestPostalOnlyReload(label, viewport, { postal, expectOutOfZone }) {
  const guestTag = `anonymous:kassa.kiruna.pall.guest.${label}.${postal}.${Date.now()}@example.com`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await clearSiteData(page);
  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await enterPostalOnly(page, postal);
  await waitZoneSettled(page);
  if (expectOutOfZone) await assertOutOfZoneShared(page);
  else await assertSharedAvailable(page);

  if (expectOutOfZone) {
    await shot(page, `${label}-guest-${postal}-before-reload.png`, {
      case: `guest_${postal}_before_reload`,
      user: guestTag,
      notes: `Guest cleared-storage ${postal} before reload — Delad disabled + zone note`,
    });
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  // Simulate browser form restore of the postal field after soft reload.
  await ensurePostalPresent(page, postal);
  await waitZoneSettled(page);
  if (expectOutOfZone) await assertOutOfZoneShared(page);
  else {
    await assertSharedAvailable(page);
    const sharedRadio = page.getByRole("radio", { name: /Delad pall/i });
    if (await sharedRadio.isVisible().catch(() => false)) {
      await sharedRadio.check({ force: true }).catch(async () => {
        await page.getByText(/^Delad pall$/i).first().click();
      });
      await waitZoneSettled(page);
      await assertSharedAvailable(page);
    }
  }

  await shot(page, `${label}-guest-${postal}-after-reload.png`, {
    case: `guest_${postal}_after_reload`,
    user: guestTag,
    notes: expectOutOfZone
      ? `Guest ${postal} after reload — Delad still disabled + same note (no 99 kr)`
      : `Guest ${postal} after reload — both channels available`,
  });

  await browser.close();
}

async function seedLoggedInKirunaUser() {
  const admin = adminClient();
  const email = `kassa.kiruna.pall.li.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kiruna Pall Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Kiruna Pall Syntetisk",
    phone: "0701122334",
    address: "Hjalmar Lundbohmsvägen 20",
    city: "Kiruna",
    postal_code: "98131",
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
  await admin.from("user_zone_addresses").upsert(
    {
      user_id: userId,
      geo_zone_id: STOCKHOLM_GEO,
      full_name: "Kiruna Pall Syntetisk",
      phone: "0701122334",
      email,
      address_line1: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal_code: "98131",
      country_code: "SE",
      region_code: null,
      is_default_for_zone: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,geo_zone_id" },
  );
  return { email, password, userId };
}

async function runLoggedInKirunaAfterReload(label, viewport, creds) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await login(page, creds.email, creds.password);
  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  // Ensure 98131 is the active postal (profile/zone may prefill; override if not).
  await ensurePostalPresent(page, "98131");
  await waitZoneSettled(page);
  await assertOutOfZoneShared(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      const input = document.querySelector("#checkout-postal");
      const inputVal =
        input && "value" in input ? String(input.value || "") : "";
      return /98131/i.test(t) || inputVal.replace(/\s+/g, "") === "98131";
    },
    { timeout: 120000 },
  );
  await ensurePostalPresent(page, "98131");
  await waitZoneSettled(page);
  await assertOutOfZoneShared(page);

  await shot(page, `${label}-loggedin-98131-after-reload.png`, {
    case: "loggedin_98131_after_reload",
    user: creds.email,
    notes: "Logged-in synthetic Kiruna 98131 after reload — Delad disabled + note",
  });

  await browser.close();
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://msdfjrrokcmjifetuwgc.supabase.co";
  }
  if (
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY
  ) {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
      process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY;
  }
  requireTestEnv();
  console.log("head", HEAD, "branch", BRANCH, "app", BASE);

  const creds = await seedLoggedInKirunaUser();
  console.log("logged_in_synth", creds.email);

  for (const [label, viewport] of [
    ["390", { width: 390, height: 844 }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    await runGuestPostalOnlyReload(label, viewport, {
      postal: "98131",
      expectOutOfZone: true,
    });
    await runGuestPostalOnlyReload(label, viewport, {
      postal: "11151",
      expectOutOfZone: false,
    });
    await runLoggedInKirunaAfterReload(label, viewport, creds);
  }

  const lines = [
    `head_sha=${HEAD}`,
    `branch=${BRANCH}`,
    `app_url=${BASE}`,
    `test_project=msdfjrrokcmjifetuwgc`,
    `locale=sv-SE`,
    `color_scheme=light`,
    `captured_at=${new Date().toISOString()}`,
    "",
    "files:",
    ...manifestRows.map(
      (r) =>
        `- ${r.file} | case=${r.case} | user=${r.user} | captured_at=${r.captured_at} | md5=${r.md5} | bytes=${r.bytes} | ${r.notes}`,
    ),
  ];
  const manifest = lines.join("\n") + "\n";
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    writeFileSync(join(dir, "manifest.txt"), manifest);
  }
  console.log("done", OUT_REPO);
  console.log(manifest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
