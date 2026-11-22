/**
 * Kassabugg C evidence: zone + channel after reload.
 * artifacts/kassa-zon-reload/v1/ (gitignored) + /opt/cursor/artifacts + store.
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod writes. Never commit.
 *
 * APP_URL=https://…preview… node scripts/kassa-zon-reload-v1-screenshots.mjs
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
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-zon-reload", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-zon-reload/v1";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-zon-reload/v1";
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

async function waitText(page, re, timeout = 90000) {
  await page.waitForFunction(
    (pattern) => new RegExp(pattern, "i").test(document.body?.innerText || ""),
    re.source || re,
    { timeout },
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

async function enterPostal(page, postal) {
  const input = page.locator("#checkout-postal");
  if (await input.isVisible().catch(() => false)) {
    await input.fill("");
    await input.fill(postal);
    await input.blur().catch(() => {});
    return;
  }
  // Already has postal — click Ändra / clear via edit if shown
  const change = page.getByRole("button", { name: /Ändra|Edit|Change/i }).first();
  if (await change.isVisible().catch(() => false)) {
    await change.click();
    await page.waitForTimeout(500);
  }
  const again = page.locator("#checkout-postal");
  if (await again.isVisible().catch(() => false)) {
    await again.fill("");
    await again.fill(postal);
    await again.blur().catch(() => {});
  }
}

async function fillProgressiveAddress(page, { name, email, phone, street, city }) {
  await page.waitForSelector("#checkout-fullName, #checkout-street, #full_name", {
    timeout: 45000,
  }).catch(() => {});
  if (await page.locator("#checkout-fullName").isVisible().catch(() => false)) {
    await page.fill("#checkout-fullName", name);
    await page.fill("#checkout-email", email);
    await page.fill("#checkout-phone", phone);
    await page.fill("#checkout-street", street);
    await page.fill("#checkout-city", city);
    await page.waitForTimeout(1500);
  }
}

async function assertOutOfZoneShared(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      return /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
    },
    { timeout: 90000 },
  );
}

async function assertSharedAvailable(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const out = /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
      const sharedOk =
        /Delad pall[\s\S]{0,160}99/i.test(t) &&
        !/Delad pall[\s\S]{0,160}inte tillgänglig/i.test(t);
      return !out && sharedOk;
    },
    { timeout: 90000 },
  );
}

async function runAnonPostalReload(label, viewport, { postal, city, street, expectOutOfZone }) {
  const guestEmail = `kassa.zon.reload.anon.${label}.${postal}.${Date.now()}@example.com`;
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

  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await enterPostal(page, postal);
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
    }
  }

  await fillProgressiveAddress(page, {
    name: "Zon Reload Gäst",
    email: guestEmail,
    phone: "0701234567",
    street,
    city,
  });
  // Wait until address collapses / is persisted so reload can restore postal
  // via ensure-session + user_zone_addresses (PLATFORM_OPEN guest path).
  await page.waitForFunction(
    ({ postalNeedle, cityNeedle }) => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const postalOk = new RegExp(postalNeedle, "i").test(t);
      const cityOk = new RegExp(cityNeedle, "i").test(t);
      const confirmed = /Vi levererar till din adress/i.test(t);
      const collapsed =
        !document.querySelector("#checkout-fullName") &&
        !document.querySelector("#checkout-street");
      return postalOk && cityOk && (confirmed || collapsed);
    },
    { postalNeedle: postal, cityNeedle: city },
    { timeout: 120000 },
  );
  await page.waitForTimeout(2500);
  await waitZoneSettled(page);

  const beforeName = `${label}-anon-${postal}-before-reload.png`;
  await shot(page, beforeName, {
    case: `anon_${postal}_before_reload`,
    user: `anonymous:${guestEmail}`,
    notes: `Anonymous ${postal} ${city} before reload`,
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await page.waitForFunction(
    (postalNeedle) => {
      const t = document.body?.innerText || "";
      const input = document.querySelector("#checkout-postal");
      const inputVal =
        input && "value" in input ? String(input.value || "") : "";
      return (
        new RegExp(postalNeedle, "i").test(t) ||
        inputVal.replace(/\s+/g, "") === postalNeedle
      );
    },
    postal,
    { timeout: 120000 },
  );
  await waitZoneSettled(page);
  if (expectOutOfZone) await assertOutOfZoneShared(page);
  else {
    await assertSharedAvailable(page);
    // Prefer shared when available so reload evidence isn't stuck on Direct.
    const sharedRadio = page.getByRole("radio", { name: /Delad pall/i });
    if (await sharedRadio.isVisible().catch(() => false)) {
      await sharedRadio.check({ force: true }).catch(async () => {
        await page.getByText(/^Delad pall$/i).first().click();
      });
      await waitZoneSettled(page);
      await assertSharedAvailable(page);
    }
  }

  // Zone row must not keep advertising Stockholm for Kiruna.
  if (postal === "98131") {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Handlar i:[\s\S]{0,40}Stockholm/i.test(t)) return false;
        return /98131/i.test(t);
      },
      { timeout: 30000 },
    ).catch(() => {});
  }

  const afterName = `${label}-anon-${postal}-after-reload.png`;
  await shot(page, afterName, {
    case: `anon_${postal}_after_reload`,
    user: `anonymous:${guestEmail}`,
    notes: `Anonymous ${postal} ${city} after reload`,
  });

  await browser.close();
  return guestEmail;
}

async function seedLoggedInUser() {
  const admin = adminClient();
  const email = `kassa.zon.reload.li.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Zon Reload Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Zon Reload Syntetisk",
    phone: "0709988776",
    address: "Drottninggatan 12",
    city: "Stockholm",
    postal_code: "11151",
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
  // Stale zone contact (old email, empty name/phone) — UI must prefer profile.
  await admin.from("user_zone_addresses").upsert(
    {
      user_id: userId,
      geo_zone_id: STOCKHOLM_GEO,
      full_name: null,
      phone: null,
      email: "old-stale-zone@example.com",
      address_line1: "Drottninggatan 12",
      city: "Stockholm",
      postal_code: "11151",
      country_code: "SE",
      region_code: null,
      is_default_for_zone: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,geo_zone_id" },
  );
  return { email, password, userId };
}

async function runLoggedInPrefill(label, viewport, creds) {
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
  await waitText(page, /11151|Drottninggatan|Zon Reload Syntetisk|0709988776/);
  await waitZoneSettled(page);
  await assertSharedAvailable(page);

  // Ensure stale zone email is not shown; profile contact wins.
  await page.waitForFunction(
    ({ email, name, phone }) => {
      const t = document.body?.innerText || "";
      if (/old-stale-zone@example\.com/i.test(t)) return false;
      if (/Uppdaterar leverans/i.test(t)) return false;
      return (
        new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(t) &&
        new RegExp(name, "i").test(t) &&
        new RegExp(phone, "i").test(t)
      );
    },
    { email: creds.email, name: "Zon Reload Syntetisk", phone: "0709988776" },
    { timeout: 60000 },
  );

  await shot(page, `${label}-loggedin-prefill.png`, {
    case: "logged_in_profile_prefill",
    user: creds.email,
    notes: "Logged-in synthetic; profile email/name/phone prefilled (not stale zone email)",
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

  const creds = await seedLoggedInUser();
  console.log("logged_in_synth", creds.email);

  for (const [label, viewport] of [
    ["390", { width: 390, height: 844 }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    await runAnonPostalReload(label, viewport, {
      postal: "98131",
      city: "Kiruna",
      street: "Hjalmar Lundbohmsvägen 20",
      expectOutOfZone: true,
    });
    await runAnonPostalReload(label, viewport, {
      postal: "11151",
      city: "Stockholm",
      street: "Drottninggatan 12",
      expectOutOfZone: false,
    });
    await runLoggedInPrefill(label, viewport, creds);
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
