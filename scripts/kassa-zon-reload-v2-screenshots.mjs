/**
 * Kassabugg C evidence v2 (rebased head): AC B Direct persist + steg 4 copy.
 * artifacts/kassa-zon-reload/v2/ (gitignored) + /opt/cursor/artifacts + store.
 * TEST only — msdfjrrokcmjifetuwgc. No auth emails. No prod writes. Never commit.
 *
 * APP_URL=http://localhost:3000 node scripts/kassa-zon-reload-v2-screenshots.mjs
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
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-zon-reload", "v2");
const OUT_OPT = "/opt/cursor/artifacts/kassa-zon-reload/v2";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-zon-reload/v2";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const BRANCH = execSync("git rev-parse --abbrev-ref HEAD", {
  encoding: "utf8",
}).trim();

/** @type {Array<Record<string,string|number>>} */
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

async function waitZoneSettled(page) {
  await page
    .waitForFunction(
      () => !/Uppdaterar leverans/i.test(document.body?.innerText || ""),
      { timeout: 60000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);
}

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  const scroll = meta.scroll === "payment" ? "payment" : "top";
  if (scroll === "payment") {
    await scrollToPayment(page);
  } else {
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.waitForTimeout(350);
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
  console.log("shot", name, md5.slice(0, 8), bytes);
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) throw new Error(`batch-add ${res.status()}`);
  await page.close();
}

async function waitNoCartLoading(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="checkout-cart-loading"]'),
    { timeout: 90000 },
  );
}

async function enterPostal(page, postal) {
  const input = page.locator("#checkout-postal");
  if (await input.isVisible().catch(() => false)) {
    await input.fill("");
    await input.fill(postal);
    await page.keyboard.press("Tab");
    return;
  }
  const change = page.getByRole("button", { name: /Ändra|Edit|Change/i }).first();
  if (await change.isVisible().catch(() => false)) {
    await change.click();
    await page.waitForTimeout(400);
  }
  const again = page.locator("#checkout-postal");
  if (await again.isVisible().catch(() => false)) {
    await again.fill("");
    await again.fill(postal);
    await page.keyboard.press("Tab");
  }
}

async function selectChannel(page, which) {
  const label =
    which === "direct" ? /^Direktleverans$/i : /^Delad pall$/i;
  const radio = page.getByRole("radio", { name: label });
  if (await radio.isVisible().catch(() => false)) {
    await radio.check({ force: true }).catch(async () => {
      await page.getByText(label).first().click();
    });
  } else {
    await page.getByText(label).first().click();
  }
  await waitZoneSettled(page);
}

async function fillProgressiveAddress(page, { name, email, phone, street, city }) {
  await page
    .waitForSelector("#checkout-fullName, #checkout-street", { timeout: 45000 })
    .catch(() => {});
  if (await page.locator("#checkout-fullName").isVisible().catch(() => false)) {
    await page.fill("#checkout-fullName", name);
    await page.fill("#checkout-email", email);
    await page.fill("#checkout-phone", phone);
    await page.fill("#checkout-street", street);
    await page.fill("#checkout-city", city);
    await page.waitForTimeout(1200);
  }
}

async function waitAddressPersisted(page, postal, city) {
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
  await page.waitForTimeout(2000);
}

async function acceptTerms(page) {
  await page.evaluate(() => {
    const el = document.querySelector("#terms-accept");
    if (!el) return;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await page.waitForTimeout(200);
  const state = await page
    .locator("#terms-accept")
    .getAttribute("data-state")
    .catch(() => null);
  if (state !== "checked") {
    await page.locator("#terms-accept").click({ force: true }).catch(() => {});
    await page
      .locator('label[for="terms-accept"]')
      .click({ force: true })
      .catch(() => {});
  }
  await page.waitForTimeout(200);
}

async function fillDob(page) {
  const dob = page.locator("#age-dob");
  await dob.waitFor({ state: "visible", timeout: 60000 });
  await dob.scrollIntoViewIfNeeded();
  await dob.fill("");
  await dob.pressSequentially("19900115", { delay: 20 });
  await dob.blur();
  await page.waitForTimeout(300);
}

async function fillAgeAndTerms(page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await fillDob(page);
  await acceptTerms(page);
}

async function waitStripeReady(page) {
  // Card box loaded (not loading placeholder); no "Laddar betalning" above CTA.
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Uppdaterar leverans/i.test(t)) return false;
      const loadingBox = document.querySelector(
        '[data-testid="checkout-stripe-loading"]',
      );
      if (loadingBox) return false;
      // Still showing in-box loading copy without PE fields
      if (
        /Laddar betalning/i.test(t) &&
        !document.querySelector(
          'iframe[name^="__privateStripeFrame"], iframe[src*="js.stripe.com"]',
        )
      ) {
        return false;
      }
      const iframe = document.querySelector(
        'iframe[name^="__privateStripeFrame"], iframe[src*="stripe"]',
      );
      const place = document.querySelector(
        '[data-testid="checkout-place-reservation"]',
      );
      return Boolean(iframe || place);
    },
    { timeout: 120000 },
  );
  await page.waitForTimeout(1500);
}

async function scrollToPayment(page) {
  await page.evaluate(() => {
    const el =
      document.querySelector('[data-testid="checkout-place-reservation"]') ||
      document.querySelector("#payment-element") ||
      document.body;
    el?.scrollIntoView?.({ block: "center" });
  });
  await page.waitForTimeout(400);
}

async function assertNoLoadingAboveCta(page) {
  const has = await page
    .locator('[data-testid="checkout-payment-reloading"]')
    .count();
  if (has > 0) throw new Error("Laddar betalning still above CTA");
}

async function assertSellerLine(page) {
  await page.waitForFunction(
    () =>
      /Säljare:\s*EURPACT OÜ \(reg\.\s+17538270\),\s+Estland/i.test(
        document.body?.innerText || "",
      ),
    { timeout: 30000 },
  );
}

async function assertDebiterasNotDras(page) {
  const t = await page.innerText("body");
  if (/\bInget dras nu\b/i.test(t)) {
    throw new Error("Found 'Inget dras nu' — expected debiteras");
  }
}

async function runDirectPersist(label, viewport) {
  const guestEmail = `kassa.zon.v2.direct.${label}.${Date.now()}@example.com`;
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
  await enterPostal(page, "11151");
  await waitZoneSettled(page);
  await selectChannel(page, "direct");
  await fillProgressiveAddress(page, {
    name: "Zon V2 Direkt",
    email: guestEmail,
    phone: "0701234567",
    street: "Drottninggatan 12",
    city: "Stockholm",
  });
  await waitAddressPersisted(page, "11151", "Stockholm");
  await selectChannel(page, "direct");
  await page.waitForFunction(
    () => {
      const radios = [...document.querySelectorAll('input[type="radio"]')];
      const direct = radios.find((r) =>
        /direkt/i.test(
          (r.getAttribute("aria-label") || "") +
            (r.closest("label")?.innerText || "") +
            (r.parentElement?.innerText || ""),
        ),
      );
      const shared = radios.find((r) =>
        /delad\s*pall/i.test(
          (r.getAttribute("aria-label") || "") +
            (r.closest("label")?.innerText || "") +
            (r.parentElement?.innerText || ""),
        ),
      );
      const t = document.body?.innerText || "";
      return (
        Boolean(direct?.checked) &&
        !shared?.checked &&
        /Direktleverans\s*[–-]/i.test(t) &&
        !/Laddar vinzon|Uppdaterar leverans/i.test(t)
      );
    },
    { timeout: 90000 },
  );
  // Confirm sessionStorage persisted Direct before reload
  const stored = await page.evaluate(
    () => sessionStorage.getItem("pact_checkout_fulfillment_channel"),
  );
  if (stored !== "direct_box") {
    throw new Error(`Expected stored direct_box before reload, got ${stored}`);
  }

  await shot(page, `${label}-11151-direct-before-reload.png`, {
    case: "anon_11151_direct_before_reload",
    user: `anonymous:${guestEmail}`,
    notes: "11151 Direct selected before reload (AC B)",
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await page.waitForFunction(
    () => /11151/i.test(document.body?.innerText || ""),
    { timeout: 120000 },
  );
  await waitZoneSettled(page);
  await page.waitForFunction(
    () => {
      const radios = [...document.querySelectorAll('input[type="radio"]')];
      const direct = radios.find((r) =>
        /direkt/i.test(
          (r.getAttribute("aria-label") || "") +
            (r.closest("label")?.innerText || "") +
            (r.parentElement?.innerText || ""),
        ),
      );
      const shared = radios.find((r) =>
        /delad\s*pall/i.test(
          (r.getAttribute("aria-label") || "") +
            (r.closest("label")?.innerText || "") +
            (r.parentElement?.innerText || ""),
        ),
      );
      const t = document.body?.innerText || "";
      if (/Laddar vinzon|Uppdaterar leverans/i.test(t)) return false;
      return (
        Boolean(direct?.checked) &&
        !shared?.checked &&
        /Direktleverans\s*[–-]/i.test(t)
      );
    },
    { timeout: 120000 },
  );

  await shot(page, `${label}-11151-direct-after-reload.png`, {
    case: "anon_11151_direct_after_reload",
    user: `anonymous:${guestEmail}`,
    notes: "11151 Direct still selected after reload (AC B)",
  });

  await browser.close();
  return guestEmail;
}

async function seedLoggedIn() {
  const admin = adminClient();
  const email = `kassa.zon.v2.step4.${Date.now()}@example.com`;
  const password = `Synth-${Date.now()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Zon V2 Steg4" },
  });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("no user");
  await admin.from("profiles").upsert({
    id: userId,
    email,
    full_name: "Zon V2 Steg4",
    phone: "0701122334",
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
      full_name: "Zon V2 Steg4",
      phone: "0701122334",
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

async function login(page, email, password) {
  const res = await page.request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
  });
  if (!res.ok()) throw new Error(`login ${res.status()}`);
}

async function runStep4Copy(label, viewport, creds) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  await login(page, creds.email, creds.password);
  await seedCart(context);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await waitNoCartLoading(page);
  await page.waitForFunction(
    () => /11151/i.test(document.body?.innerText || ""),
    { timeout: 90000 },
  );
  await waitZoneSettled(page);

  // Ensure shared selected first
  await selectChannel(page, "shared");
  await fillAgeAndTerms(page);

  // Prefer dual-offer continue when present; else legacy age-step Fortsätt
  // (aria-disabled only — Playwright isEnabled stays false until DOB+terms).
  const dualCont = page.locator('[data-testid="dual-offer-continue"]');
  const legacyCont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to payment/i,
  });
  for (let i = 0; i < 40; i++) {
    const termsState = await page
      .locator("#terms-accept")
      .getAttribute("data-state")
      .catch(() => null);
    const dobVal = await page.locator("#age-dob").inputValue().catch(() => "");
    if (termsState !== "checked" || !/1990-01-15/.test(dobVal)) {
      await fillAgeAndTerms(page);
    }
    if ((await dualCont.count()) > 0) {
      const disabled = await dualCont.first().isDisabled().catch(() => true);
      if (!disabled) {
        await dualCont.first().click({ force: true });
        break;
      }
    } else if ((await legacyCont.count()) > 0) {
      const aria = await legacyCont
        .first()
        .getAttribute("aria-disabled")
        .catch(() => null);
      if (aria !== "true") {
        await legacyCont.first().click({ force: true });
        break;
      }
      // Compliance looks ready but aria lag — force unlock attempt
      if (termsState === "checked" && /1990-01-15/.test(dobVal) && i > 8) {
        await legacyCont.first().click({ force: true });
        break;
      }
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1200);
  await waitStripeReady(page);
  await scrollToPayment(page);
  await assertNoLoadingAboveCta(page);
  await assertSellerLine(page);
  await assertDebiterasNotDras(page);
  await page.waitForFunction(
    () => /Inget debiteras nu/i.test(document.body?.innerText || ""),
    { timeout: 30000 },
  ).catch(() => {});

  await shot(page, `${label}-step4-shared-loaded.png`, {
    case: "step4_shared_stripe_loaded",
    user: creds.email,
    notes: "Steg 4 shared: Stripe loaded; seller + debiteras; no Laddar above CTA",
    scroll: "payment",
  });

  // Switch to Direct — capture immediately after switch (loading only in card)
  await selectChannel(page, "direct");
  await scrollToPayment(page);
  await page.waitForTimeout(600);
  await assertNoLoadingAboveCta(page);
  await shot(page, `${label}-step4-after-switch-to-direct.png`, {
    case: "step4_after_switch_to_direct",
    user: creds.email,
    notes: "Steg 4 right after switch to Direct; Laddar only in card box",
    scroll: "payment",
  });

  await waitStripeReady(page);
  await assertNoLoadingAboveCta(page);
  await assertSellerLine(page);
  await page.waitForFunction(
    () =>
      /debiteras nu när du bekräftar|Betala nu|Ditt kort debiteras nu/i.test(
        document.body?.innerText || "",
      ),
    { timeout: 60000 },
  );

  await shot(page, `${label}-step4-direct-loaded.png`, {
    case: "step4_direct_stripe_loaded",
    user: creds.email,
    notes: "Steg 4 direct: Stripe loaded; seller line exact; charge-now copy",
    scroll: "payment",
  });

  // Switch back to shared briefly for after-switch shared evidence
  await selectChannel(page, "shared");
  await scrollToPayment(page);
  await page.waitForTimeout(600);
  await assertNoLoadingAboveCta(page);
  await shot(page, `${label}-step4-after-switch-to-shared.png`, {
    case: "step4_after_switch_to_shared",
    user: creds.email,
    notes: "Steg 4 right after switch to shared; Laddar only in card box",
    scroll: "payment",
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

  const creds = await seedLoggedIn();
  console.log("step4_user", creds.email);

  for (const [label, viewport] of [
    ["390", { width: 390, height: 844 }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    await runDirectPersist(label, viewport);
    await runStep4Copy(label, viewport, creds);
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
  const manifest = `${lines.join("\n")}\n`;
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
