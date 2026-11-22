/**
 * Evidence: checkout postal/address save (v1) — before/after Kiruna 98131.
 * Writes artifacts/kassa-postnummer/v1/ (gitignored) + /opt/cursor/artifacts + store.
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod writes.
 *
 * Reproduces logged-in stale zone-address session (Stockholm 11151 → Kiruna).
 *
 * node scripts/kassa-postnummer-v1-address-save-screenshots.mjs
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  unlinkSync,
  copyFileSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const STOCKHOLM_GEO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-postnummer", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-postnummer/v1";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-postnummer/v1";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

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

function requireTestEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!url.includes("msdfjrrokcmjifetuwgc")) {
    throw new Error("Refusing: NEXT_PUBLIC_SUPABASE_URL is not TEST");
  }
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  if (pk && !(pk.startsWith("pk_test") || pk.startsWith("pk_test_"))) {
    throw new Error("Refusing: Stripe publishable key is not test mode");
  }
}

async function seedStaleSessionUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) throw new Error("Missing supabase env");
  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `kassa.postal.v1.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kassa Postal V1 Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");

  // Street lives on user_zone_addresses; profiles may have no address column.
  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Kassa Postal V1 Syntetisk",
    phone: "0701234567",
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

  await admin.from("user_zone_addresses").upsert(
    {
      user_id: userId,
      geo_zone_id: STOCKHOLM_GEO,
      full_name: "Kassa Postal V1 Syntetisk",
      phone: "0701234567",
      email,
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

async function shot(page, name) {
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const buf = readFileSync(join(OUT_REPO, name));
  console.log(
    "shot",
    name,
    createHash("md5").update(buf).digest("hex").slice(0, 8),
    statSync(join(OUT_REPO, name)).size,
  );
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

async function openPostalModal(page) {
  // Step 1 "Ändra" is the first edit control when a full address exists;
  // Radix DialogTrigger needs a real DOM click (Playwright force-click misses it).
  const edit = page.getByRole("button", { name: /Ändra|Edit|Change/i }).first();
  await edit.waitFor({ state: "visible", timeout: 15000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await edit.evaluate((el) => {
    if (el instanceof HTMLElement) el.click();
  });
  try {
    await page.waitForSelector("#postal_code", { state: "visible", timeout: 8000 });
  } catch {
    await edit.evaluate((el) => {
      if (el instanceof HTMLElement) el.click();
    });
    await page.waitForSelector("#postal_code", { state: "visible", timeout: 20000 });
  }
}

async function saveKirunaInModal(page) {
  await page.fill("#full_name", "Kassa Postal V1 Syntetisk");
  // Keep same email as session user to avoid ensure-session churn.
  const emailVal = await page.inputValue("#email");
  if (!emailVal) {
    await page.fill("#email", `kassa.postal.v1.after.${Date.now()}@example.com`);
  }
  await page.fill("#phone", "0701234567");
  await page.fill("#address", "Hjalmar Lundbohmsvägen 20");
  await page.fill("#city", "Kiruna");
  await page.fill("#postal_code", "98131");
  await page.getByRole("button", { name: /Spara|Save/i }).click();
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return /Sparat\.|Saved/i.test(t);
    },
    { timeout: 25000 },
  ).catch(() => {});
  // Modal should close; wait for Kiruna to surface in checkout.
  await page.waitForFunction(
    () => {
      if (document.querySelector("#postal_code")) return false;
      const t = document.body?.innerText || "";
      return /981\s*31|98131/i.test(t) && /Kiruna/i.test(t);
    },
    { timeout: 45000 },
  );
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      // Require out-of-zone copy or direct selected — bare "149" is always on the radio.
      const outOfZone =
        /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
      const directChecked = Boolean(
        document.querySelector(
          'input[name="fulfillment_channel"][value="direct_box"]:checked',
        ),
      );
      const frakt149 = /Frakt[\s\S]{0,40}149/i.test(t);
      return outOfZone || directChecked || frakt149;
    },
    { timeout: 60000 },
  );
  await page.waitForTimeout(800);
}

async function runViewport(label, viewport, creds) {
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
  await page.waitForFunction(
    () => {
      if (document.querySelector('[data-testid="checkout-cart-loading"]')) {
        return false;
      }
      const t = document.body?.innerText || "";
      return /111\s*51|11151/i.test(t) && /Drottninggatan|Postnummer/i.test(t);
    },
    { timeout: 90000 },
  );
  // Wait out zone spinner so Ändra/DialogTrigger is clickable.
  await page
    .waitForFunction(
      () => !/Uppdaterar leverans/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, `${label}-before-11151.png`);

  await openPostalModal(page);
  await saveKirunaInModal(page);
  await shot(page, `${label}-after-98131.png`);

  // Reload persistence check (logged-in stale session path).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => {
      if (document.querySelector('[data-testid="checkout-cart-loading"]')) {
        return false;
      }
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      return (
        /981\s*31|98131/i.test(t) &&
        /Kiruna/i.test(t) &&
        /Direktleverans/i.test(t)
      );
    },
    { timeout: 90000 },
  );
  await page.waitForTimeout(800);
  await shot(page, `${label}-after-reload-98131.png`);

  await browser.close();
}

async function main() {
  loadEnvLocal();
  requireTestEnv();
  const synthEmails = [];

  for (const [label, viewport] of [
    ["390", { width: 390, height: 844 }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    // Fresh stale Stockholm session per viewport — prior viewport mutates to Kiruna.
    const creds = await seedStaleSessionUser();
    synthEmails.push(creds.email);
    console.log("viewport", label, creds.email);
    await runViewport(label, viewport, creds);
  }

  writeFileSync(
    join(OUT_REPO, "manifest.txt"),
    [
      `head=${process.env.GIT_HEAD || "local"}`,
      `test_project=msdfjrrokcmjifetuwgc`,
      `synthetic=${synthEmails.join(",")}`,
      `files=${["390-before-11151.png","390-after-98131.png","390-after-reload-98131.png","1440-before-11151.png","1440-after-98131.png","1440-after-reload-98131.png"].join(",")}`,
    ].join("\n") + "\n",
  );
  for (const dir of [OUT_OPT, OUT_STORE]) {
    copyFileSync(join(OUT_REPO, "manifest.txt"), join(dir, "manifest.txt"));
  }
  console.log("done", OUT_REPO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
