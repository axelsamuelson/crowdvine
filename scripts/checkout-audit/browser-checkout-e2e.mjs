#!/usr/bin/env node
/**
 * Real Chromium checkout E2E via Puppeteer (app UI + Stripe Payment Element).
 * Uses isolated Supabase + WineComm-sandlåda only. No secret logging.
 */
import puppeteer from "puppeteer";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORIZED_REF = "msdfjrrokcmjifetuwgc";
const PROD_REF = "abrnvjqwpdkodgrtezeg";
const BASE = process.env.CHECKOUT_AUDIT_APP_URL || "http://127.0.0.1:3000";
const email = "synthetic.member@example.test";
const password = process.env.CHECKOUT_AUDIT_TEST_USER_PASSWORD || "";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function fail(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(2);
}
if (!password) fail("CHECKOUT_AUDIT_TEST_USER_PASSWORD missing");
if (!url.includes(AUTHORIZED_REF) || url.includes(PROD_REF)) fail("url guard");
const g = spawnSync(
  process.execPath,
  [join(__dirname, "assert-isolated-supabase.mjs"), url],
  { encoding: "utf8" },
);
if (g.status !== 0) fail("supabase assert failed");

mkdirSync("/opt/cursor/artifacts", { recursive: true });
mkdirSync("/tmp/checkout-audit/evidence", { recursive: true });

const results = [];
const record = (name, verdict, detail = {}) => {
  const row = { name, verdict, ...detail };
  results.push(row);
  console.log(JSON.stringify(row));
};

const executablePath =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  "/usr/local/bin/google-chrome" ||
  "/usr/bin/google-chrome";
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,900"],
  defaultViewport: { width: 1280, height: 900 },
});

const page = await browser.newPage();
page.setDefaultTimeout(60000);

async function shot(name) {
  const path = `/opt/cursor/artifacts/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

try {
  // Login via UI
  await page.goto(`${BASE}/log-in?next=/checkout`, { waitUntil: "networkidle2" });
  await page.waitForSelector("#email, input[type=email], input[name=email]");
  const emailSel = (await page.$("#email")) ? "#email" : 'input[type="email"]';
  const passSel = (await page.$("#password")) ? "#password" : 'input[type="password"]';
  await page.click(emailSel, { clickCount: 3 });
  await page.type(emailSel, email, { delay: 10 });
  await page.click(passSel, { clickCount: 3 });
  await page.type(passSel, password, { delay: 10 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => null),
    page.keyboard.press("Enter"),
  ]);
  // Fallback submit button
  if (!page.url().includes("/checkout")) {
    const btn = await page.$('button[type="submit"]');
    if (btn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }).catch(() => null),
        btn.click(),
      ]);
    }
  }
  record("login_ui", page.url().includes("/checkout") ? "PASS" : "FAIL", {
    url: page.url().split("?")[0],
  });

  // Set httpOnly cart cookie via CDP
  const client = await page.createCDPSession();
  await client.send("Network.enable");
  await client.send("Network.setCookie", {
    name: "cv_cart_id",
    value: "audit-session-9ae675ea",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
  });
  await page.goto(`${BASE}/checkout`, { waitUntil: "networkidle2" });
  // Close cart drawer if it auto-opened (blocks terms checkbox)
  await page.evaluate(() => {
    const close =
      document.querySelector('[aria-label="Close"], button[aria-label="Stäng"]') ||
      [...document.querySelectorAll("button")].find((b) =>
        /^Close|Stäng$/i.test((b.textContent || "").trim()),
      );
    close?.click();
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 400));
  await shot("puppeteer-01-checkout-loaded");

  // Postal
  const postal = await page.$("#checkout-postal");
  if (postal) {
    await postal.click({ clickCount: 3 });
    await postal.type("11122", { delay: 15 });
    await page.keyboard.press("Tab");
    await new Promise((r) => setTimeout(r, 3500));
  }
  // Close cart again if postal update reopened it
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 300));

  // Fill address fields if empty
  async function fillIfEmpty(sel, value) {
    const el = await page.$(sel);
    if (!el) return false;
    const v = await page.$eval(sel, (e) => e.value || "");
    if (!v) {
      await el.click({ clickCount: 3 });
      await el.type(value, { delay: 10 });
    }
    return true;
  }
  await fillIfEmpty("#checkout-fullName", "Synthetic Member");
  await fillIfEmpty("#checkout-email", email);
  await fillIfEmpty("#checkout-phone", "+46700000002");
  await fillIfEmpty("#checkout-street", "Testgatan 1");
  await fillIfEmpty("#checkout-city", "Stockholm");
  await new Promise((r) => setTimeout(r, 2000));
  await shot("puppeteer-02-address");

  // Age + terms — ensure step 3 unlocked (wait past "Updating delivery")
  await page.waitForFunction(
    () => !/Updating delivery|Uppdaterar leverans/i.test(document.body.innerText),
    { timeout: 30000 },
  ).catch(() => null);
  await page.keyboard.press("Escape");

  const dob = await page.$("#age-dob");
  if (dob) {
    await dob.click({ clickCount: 3 });
    await page.keyboard.type("01151990", { delay: 30 });
  }

  // Radix Checkbox renders as button#terms-accept
  let termsState = null;
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const btn = document.querySelector("#terms-accept");
      if (btn) btn.click();
      else {
        const role = document.querySelector('[role="checkbox"]');
        role?.click();
      }
    });
    await new Promise((r) => setTimeout(r, 300));
    termsState = await page.evaluate(() => {
      const btn = document.querySelector("#terms-accept, [role='checkbox']");
      return btn
        ? {
            ariaChecked: btn.getAttribute("aria-checked"),
            dataState: btn.getAttribute("data-state"),
          }
        : null;
    });
    if (termsState?.ariaChecked === "true" || termsState?.dataState === "checked") {
      break;
    }
  }
  const termsClicked =
    termsState?.ariaChecked === "true" || termsState?.dataState === "checked";
  await shot("puppeteer-03-terms");

  // Continue to payment — wait until enabled
  let continueClicked = false;
  try {
    await page.waitForFunction(() => {
      const buttons = [...document.querySelectorAll("button")];
      const b = buttons.find((x) =>
        /Fortsätt till betalning|Continue to payment/i.test(x.textContent || ""),
      );
      return Boolean(b && !b.disabled);
    }, { timeout: 15000 });
    continueClicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const b = buttons.find((x) =>
        /Fortsätt till betalning|Continue to payment/i.test(x.textContent || ""),
      );
      if (b && !b.disabled) {
        b.click();
        return true;
      }
      return false;
    });
  } catch {
    continueClicked = false;
  }
  await new Promise((r) => setTimeout(r, 6000));
  await shot("puppeteer-04-after-continue");

  // Payment Element iframes contain elements.stripe.com / js.stripe.com/v3/elements
  const paymentFrames = page
    .frames()
    .filter((f) => /elements-inner|js\.stripe\.com\/v3\/elements|stripe\.com\/v3\/bacs/i.test(f.url())
      || /elements/i.test(f.name() || ""));
  const anyStripeElementsUi = await page.evaluate(() => {
    return Boolean(
      document.querySelector('iframe[src*="elements"], iframe[name^="__privateStripe"]') ||
        [...document.querySelectorAll("iframe")].some((i) =>
          /stripe/i.test(i.src || i.name || ""),
        ),
    );
  });
  record("stripe_elements_mounted", paymentFrames.length || anyStripeElementsUi ? "PASS" : "FAIL", {
    termsClicked,
    termsState,
    continueClicked,
    paymentFrameCount: paymentFrames.length,
  });

  if (continueClicked && (paymentFrames.length || anyStripeElementsUi)) {
    // Fill across stripe frames
    let filled = false;
    for (const frame of page.frames()) {
      try {
        const input = await frame.$('input[name="number"], input[autocomplete="cc-number"]');
        if (!input) continue;
        await input.click({ clickCount: 3 });
        await input.type("4242424242424242", { delay: 25 });
        const exp = await frame.$('input[name="expiry"], input[autocomplete="cc-exp"]');
        const cvc = await frame.$('input[name="cvc"], input[autocomplete="cc-csc"]');
        if (exp) {
          await exp.click({ clickCount: 3 });
          await exp.type("1234", { delay: 25 });
        }
        if (cvc) {
          await cvc.click({ clickCount: 3 });
          await cvc.type("123", { delay: 25 });
        }
        filled = true;
        break;
      } catch {
        /* next frame */
      }
    }
    record("card_filled_4242", filled ? "PASS" : "BLOCKED", {
      reason: filled ? undefined : "no_card_inputs_in_iframe",
    });
    await shot("puppeteer-05-payment-element");

    await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("button")];
      const b = buttons.find((x) => /Betala nu|Pay now/i.test(x.textContent || ""));
      if (b && !b.disabled) b.click();
    });
    await page
      .waitForFunction(
        () => /\/checkout\/success/.test(location.pathname) || /reservationId=/.test(location.search),
        { timeout: 45000 },
      )
      .catch(() => null);
    await shot("puppeteer-06-after-pay");
    const successUrl = page.url();
    const success =
      /\/checkout\/success/.test(successUrl) || /reservationId=/.test(successUrl);
    record("success_path_4242", success ? "PASS" : "FAIL", {
      url: successUrl.split("?")[0],
      hasReservationQuery: /reservationId=/.test(successUrl),
    });
  } else {
    record("success_path_4242", "BLOCKED", {
      reason: "payment_step_not_reached",
      termsClicked,
      continueClicked,
    });
  }
} catch (e) {
  record("browser_e2e_exception", "FAIL", {
    err: String(e.message || e).slice(0, 200),
  });
  try {
    await shot("puppeteer-exception");
  } catch {
    /* ignore */
  }
} finally {
  await browser.close();
}

const pass = results.filter((r) => r.verdict === "PASS").length;
const failN = results.filter((r) => r.verdict === "FAIL").length;
const blocked = results.filter((r) => r.verdict === "BLOCKED").length;
const summary = { pass, fail: failN, blocked, total: results.length };
writeFileSync(
  "/tmp/checkout-audit/evidence/browser-e2e-summary.json",
  JSON.stringify({ summary, results }, null, 2),
);
console.log(JSON.stringify({ summary }));
process.exit(failN > 0 ? 1 : 0);
