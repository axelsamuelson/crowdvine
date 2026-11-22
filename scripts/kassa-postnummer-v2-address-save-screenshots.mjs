/**
 * Evidence v2: same synthetic user through Camille's flow + guest + reverse.
 * artifacts/kassa-postnummer/v2/ (gitignored) + /opt/cursor/artifacts + store.
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod writes. Never commit.
 *
 * node scripts/kassa-postnummer-v2-address-save-screenshots.mjs
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
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const STOCKHOLM_GEO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-postnummer", "v2");
const OUT_OPT = "/opt/cursor/artifacts/kassa-postnummer/v2";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-postnummer/v2";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<{file:string, case:string, user:string, notes:string}>} */
const manifestRows = [];

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

async function seedLoggedInStockholmUser(label) {
  const admin = adminClient();
  const email = `kassa.postal.v2.${label}.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Kassa Postal V2 Syntetisk" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("No synthetic user id");

  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Kassa Postal V2 Syntetisk",
    phone: "0701234567",
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

  await admin.from("user_zone_addresses").upsert(
    {
      user_id: userId,
      geo_zone_id: STOCKHOLM_GEO,
      full_name: "Kassa Postal V2 Syntetisk",
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

  return { email, password, userId, kind: "logged_in" };
}

async function shot(page, name, meta) {
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

async function waitCheckoutReady(page, postalNeedle) {
  await page.waitForFunction(
    (needle) => {
      if (document.querySelector('[data-testid="checkout-cart-loading"]')) {
        return false;
      }
      const t = document.body?.innerText || "";
      return new RegExp(needle, "i").test(t);
    },
    postalNeedle,
    { timeout: 90000 },
  );
  await page
    .waitForFunction(
      () => !/Uppdaterar leverans/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    )
    .catch(() => {});
}

async function openPostalModal(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const edit = page.getByRole("button", { name: /Ändra|Edit|Change/i }).first();
  await edit.waitFor({ state: "visible", timeout: 15000 });
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

async function fillModalAddress(page, { street, city, postal, email }) {
  const name = (await page.inputValue("#full_name").catch(() => "")) || "Kassa Postal V2 Syntetisk";
  await page.fill("#full_name", name);
  if (email) await page.fill("#email", email);
  else if (!(await page.inputValue("#email"))) {
    throw new Error("Modal email empty and no email provided");
  }
  await page.fill("#phone", "0701234567");
  await page.fill("#address", street);
  await page.fill("#city", city);
  await page.fill("#postal_code", postal);
}

async function saveModalAndWait(page, { expectPostal, expectCity, expectDirectOutOfZone }) {
  await page.getByRole("button", { name: /Spara|Save/i }).click();
  await page.waitForFunction(
    () => {
      if (document.querySelector("#postal_code")) return false;
      const t = document.body?.innerText || "";
      return /Sparat\.|Saved/i.test(t) || true;
    },
    { timeout: 15000 },
  ).catch(() => {});

  await page.waitForFunction(
    ({ postal, city }) => {
      if (document.querySelector("#postal_code")) return false;
      if (document.querySelector('[data-testid="checkout-cart-loading"]')) {
        return false;
      }
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const postalOk = new RegExp(postal.replace(/\s+/g, "\\s*"), "i").test(t);
      const cityOk = new RegExp(city, "i").test(t);
      return postalOk && cityOk;
    },
    { postal: expectPostal, city: expectCity },
    { timeout: 60000 },
  );

  if (expectDirectOutOfZone) {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Uppdaterar leverans/i.test(t)) return false;
        // Radios have no value= attrs — assert via copy + shipping.
        const outOfZone =
          /utanför leveranszonen|inte tillgänglig för ditt postnummer/i.test(t);
        const frakt149 = /Frakt[\s\S]{0,40}149/i.test(t);
        return outOfZone || frakt149;
      },
      { timeout: 60000 },
    );
  } else {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Uppdaterar leverans/i.test(t)) return false;
        // Delad pall selectable again: no out-of-zone copy; 99 kr shipping.
        const outOfZone = /utanför leveranszonen/i.test(t);
        const sharedSubtitleOk =
          /Delad pall[\s\S]{0,120}99/i.test(t) &&
          !/Delad pall[\s\S]{0,120}inte tillgänglig/i.test(t);
        const frakt99 = /Frakt[\s\S]{0,40}99/i.test(t);
        return !outOfZone && (sharedSubtitleOk || frakt99);
      },
      { timeout: 60000 },
    );
  }
  await page.waitForTimeout(600);
}

async function guestFillPostalAndAddress(page, { postal, city, street, email }) {
  // Clear / enter postal on step 1 if needed
  const postalInput = page.locator("#checkout-postal");
  if (await postalInput.isVisible().catch(() => false)) {
    await postalInput.fill("");
    await postalInput.fill(postal);
    await postalInput.blur().catch(() => {});
  } else {
    await openPostalModal(page);
    await fillModalAddress(page, {
      street,
      city,
      postal,
      email,
    });
    await page.getByRole("button", { name: /Spara|Save/i }).click();
    await page.waitForSelector("#postal_code", { state: "hidden", timeout: 20000 }).catch(() => {});
    return;
  }
  await page.waitForTimeout(2500);

  // Progressive address fields
  await page.waitForSelector("#checkout-fullName, #full_name, #checkout-street", {
    timeout: 30000,
  }).catch(() => {});
  if (await page.locator("#checkout-fullName").isVisible().catch(() => false)) {
    await page.fill("#checkout-fullName", "Kassa Postal V2 Gäst");
    await page.fill("#checkout-email", email);
    await page.fill("#checkout-phone", "0701234567");
    await page.fill("#checkout-street", street);
    await page.fill("#checkout-city", city);
    await page.waitForTimeout(2000);
  }
}

/** Logged-in Camille flow: before → after (no reload) → after-reload → reverse */
async function runLoggedInCamilleFlow(label, viewport, sharedCreds) {
  const creds = sharedCreds ?? (await seedLoggedInStockholmUser(label));
  // Re-seed Stockholm zone state when reusing the same user across viewports.
  if (sharedCreds) {
    const admin = adminClient();
    await admin.from("profiles").upsert({
      id: creds.userId,
      email: creds.email,
      full_name: "Kassa Postal V2 Syntetisk",
      phone: "0701234567",
      address: "Drottninggatan 12",
      city: "Stockholm",
      postal_code: "11151",
      country: "SE",
    });
    await admin.from("user_zone_addresses").upsert(
      {
        user_id: creds.userId,
        geo_zone_id: STOCKHOLM_GEO,
        full_name: "Kassa Postal V2 Syntetisk",
        phone: "0701234567",
        email: creds.email,
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
  }
  console.log("logged_in_user", label, creds.email);

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
  await waitCheckoutReady(page, "11151");
  await shot(page, `${label}-loggedin-before-11151.png`, {
    case: "logged_in_before_stockholm",
    user: creds.email,
    notes: "Same user; Stockholm 11151 saved zone address",
  });

  await openPostalModal(page);
  await fillModalAddress(page, {
    street: "Hjalmar Lundbohmsvägen 20",
    city: "Kiruna",
    postal: "98131",
    email: creds.email,
  });
  await saveModalAndWait(page, {
    expectPostal: "98131",
    expectCity: "Kiruna",
    expectDirectOutOfZone: true,
  });
  await shot(page, `${label}-loggedin-after-98131.png`, {
    case: "logged_in_after_kiruna_no_reload",
    user: creds.email,
    notes: "Same user; after modal save, no reload",
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitCheckoutReady(page, "98131");
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      return (
        /Kiruna/i.test(t) &&
        (/utanför leveranszonen|Direktleverans/i.test(t))
      );
    },
    { timeout: 90000 },
  );
  await shot(page, `${label}-loggedin-after-reload-98131.png`, {
    case: "logged_in_after_reload_kiruna",
    user: creds.email,
    notes: "Same user; after full page reload",
  });

  // Reverse: 98131 → 11151, Delad pall selectable again
  await openPostalModal(page);
  await fillModalAddress(page, {
    street: "Drottninggatan 12",
    city: "Stockholm",
    postal: "11151",
    email: creds.email,
  });
  await saveModalAndWait(page, {
    expectPostal: "11151",
    expectCity: "Stockholm",
    expectDirectOutOfZone: false,
  });
  await shot(page, `${label}-loggedin-reverse-11151.png`, {
    case: "logged_in_reverse_to_stockholm",
    user: creds.email,
    notes: "Same user; 98131→11151 Delad pall selectable",
  });

  await browser.close();
  return creds.email;
}

/** Anonymous / new session: start empty, set Stockholm, change to Kiruna via modal */
async function runAnonymousFlow(label, viewport) {
  const guestEmail = `kassa.postal.v2.guest.${label}.${Date.now()}@example.com`;
  console.log("guest_user", label, guestEmail);

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
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    { timeout: 90000 },
  );

  await guestFillPostalAndAddress(page, {
    postal: "11151",
    city: "Stockholm",
    street: "Drottninggatan 12",
    email: guestEmail,
  });
  await waitCheckoutReady(page, "11151");
  await shot(page, `${label}-anon-before-11151.png`, {
    case: "anonymous_before_stockholm",
    user: `anonymous:${guestEmail}`,
    notes: "New session guest; Stockholm filled",
  });

  // Change postal via Ändra → modal (once full address collapsed)
  const hasModalTrigger = await page
    .getByRole("button", { name: /Ändra|Edit|Change/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (hasModalTrigger && !(await page.locator("#checkout-postal").isVisible().catch(() => false))) {
    await openPostalModal(page);
    await fillModalAddress(page, {
      street: "Hjalmar Lundbohmsvägen 20",
      city: "Kiruna",
      postal: "98131",
      email: guestEmail,
    });
    await saveModalAndWait(page, {
      expectPostal: "98131",
      expectCity: "Kiruna",
      expectDirectOutOfZone: true,
    });
  } else {
    await guestFillPostalAndAddress(page, {
      postal: "98131",
      city: "Kiruna",
      street: "Hjalmar Lundbohmsvägen 20",
      email: guestEmail,
    });
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Uppdaterar leverans/i.test(t)) return false;
        return /98131/i.test(t) && /Kiruna/i.test(t);
      },
      { timeout: 60000 },
    );
  }

  await shot(page, `${label}-anon-after-98131.png`, {
    case: "anonymous_after_kiruna",
    user: `anonymous:${guestEmail}`,
    notes: "New session guest; changed to Kiruna 98131",
  });

  await browser.close();
  return guestEmail;
}

async function main() {
  loadEnvLocal();
  requireTestEnv();
  console.log("head", HEAD, "branch", BRANCH);

  // One logged-in synthetic user for the whole Camille flow (both viewports).
  const camilleCreds = await seedLoggedInStockholmUser("camille-shared");
  console.log("camille_shared_user", camilleCreds.email);

  for (const [label, viewport] of [
    ["390", { width: 390, height: 844 }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    await runLoggedInCamilleFlow(label, viewport, camilleCreds);
    await runAnonymousFlow(label, viewport);
  }

  // Guard: before/after/reload for logged-in must not be byte-identical
  for (const label of ["390", "1440"]) {
    const a = join(OUT_REPO, `${label}-loggedin-before-11151.png`);
    const b = join(OUT_REPO, `${label}-loggedin-after-98131.png`);
    const c = join(OUT_REPO, `${label}-loggedin-after-reload-98131.png`);
    const ha = createHash("md5").update(readFileSync(a)).digest("hex");
    const hb = createHash("md5").update(readFileSync(b)).digest("hex");
    const hc = createHash("md5").update(readFileSync(c)).digest("hex");
    if (ha === hb) throw new Error(`${label}: before === after (byte identical)`);
    if (hb === hc) {
      console.warn(
        `${label}: after === after-reload (same pixels OK if state identical; sizes ${statSync(b).size})`,
      );
    }
    // after vs reload may look similar if state persisted — require different from before
    if (ha === hc) throw new Error(`${label}: before === after-reload`);
  }

  const lines = [
    `head_sha=${HEAD}`,
    `branch=${BRANCH}`,
    `test_project=msdfjrrokcmjifetuwgc`,
    `locale=sv-SE`,
    `color_scheme=light`,
    `captured_at=${new Date().toISOString()}`,
    "",
    "files:",
    ...manifestRows.map(
      (r) =>
        `- ${r.file} | case=${r.case} | user=${r.user} | md5=${r.md5} | bytes=${r.bytes} | ${r.notes}`,
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
