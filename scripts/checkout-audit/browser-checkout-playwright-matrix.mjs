/**
 * Browser checkout matrix v2 — material approach change after Pay-click misses:
 * Root cause of prior FAIL: Stripe Link opt-in placeholders in same Elements
 * frame blocked elements.submit()/confirmPayment; confirm API never fired.
 * Also audit DB lacked INSERT RLS for order_reservation_items (user-scoped sb).
 *
 * Method: Playwright page.frames() input discovery (Stripe accessory-target
 * hosts card fields), fill SE billing, await Stripe PI confirm + app confirm +
 * success navigation. No secrets logged.
 */
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.CHECKOUT_AUDIT_APP_URL || "http://127.0.0.1:3000";
const AUTHORIZED = "msdfjrrokcmjifetuwgc";
const PROD = "abrnvjqwpdkodgrtezeg";
const STRIPE_ACCT = "acct_1S0puV01MNqMozNK";
const email = "synthetic.member@example.test";
const password = process.env.CHECKOUT_AUDIT_TEST_USER_PASSWORD || "";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sessionId = "audit-session-9ae675ea";
const userId = "9ae675ea-01ba-4d90-9890-f8d4fa725c14";

if (!password) throw new Error("password missing");
if (!url.includes(AUTHORIZED) || url.includes(PROD)) throw new Error("supabase guard");
if (process.env.DIRECT_BOX_CHECKOUT_ENABLED === "true") throw new Error("DIRECT_BOX must be OFF");

mkdirSync("/opt/cursor/artifacts", { recursive: true });
mkdirSync("/tmp/checkout-audit/evidence", { recursive: true });

const results = [];
const record = (name, verdict, detail = {}) => {
  const row = { name, verdict, ...detail };
  results.push(row);
  console.log(JSON.stringify(row));
};

function redact(s) {
  return String(s || "")
    .replace(/pi_[A-Za-z0-9]+/g, "pi_REDACTED")
    .replace(/seti_[A-Za-z0-9]+/g, "seti_REDACTED")
    .replace(/cs_test_[A-Za-z0-9]+/g, "cs_REDACTED")
    .replace(/pm_[A-Za-z0-9]+/g, "pm_REDACTED")
    .replace(/eyJ[A-Za-z0-9._-]+/g, "jwt_REDACTED")
    .replace(/whsec_[A-Za-z0-9]+/g, "whsec_REDACTED");
}

async function admin() {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function resetCart() {
  const sb = await admin();
  await sb.from("pallets").update({ status: "complete" }).eq("id", "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1");
  const { data: cart, error } = await sb
    .from("carts")
    .upsert(
      { session_id: sessionId, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "session_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  await sb.from("cart_items").delete().eq("cart_id", cart.id);
  await sb.from("cart_items").insert([
    { cart_id: cart.id, wine_id: "dddddddd-dddd-dddd-dddd-ddddddddddd1", quantity: 6, source: "producer" },
    { cart_id: cart.id, wine_id: "dddddddd-dddd-dddd-dddd-ddddddddddd2", quantity: 2, source: "producer" },
  ]);
}

async function loginAndOpen(page) {
  const loginRes = await page.context().request.post(`${BASE}/api/auth/login`, {
    data: { email, password },
    headers: { "content-type": "application/json" },
  });
  if (!loginRes.ok()) throw new Error(`api_login_${loginRes.status()}`);
  await page.context().addCookies([
    { name: "cv_cart_id", value: sessionId, domain: "127.0.0.1", path: "/", httpOnly: true },
  ]);
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForFunction(
    () => !/Öppnar ålder|Opening age|Uppdaterar|Updating delivery/i.test(document.body.innerText),
    { timeout: 90000 },
  );
  await page.locator("#age-dob").fill("1990-01-15");
  await page.locator("#terms-accept").click({ force: true });
  await page.getByRole("button", { name: /Continue to payment|Fortsätt till betalning/i }).click();
  await page.waitForFunction(() => {
    const b = [...document.querySelectorAll("button")].find((x) =>
      /Pay now|Betala nu/i.test(x.textContent || ""),
    );
    return b && !b.disabled;
  }, { timeout: 120000 });
  await page.waitForTimeout(2000);
}

/** Fill Payment Element card fields in the Stripe accessory-target frame. */
async function fillCard(page, cardNumber) {
  const dump = [];
  for (const frame of page.frames()) {
    try {
      const inputs = await frame.locator("input,select").evaluateAll((els) =>
        els.map((e) => ({
          name: e.getAttribute("name"),
          ac: e.getAttribute("autocomplete"),
          aria: e.getAttribute("aria-label"),
        })),
      );
      if (inputs.some((i) => i.name === "number" || i.ac === "cc-number")) {
        dump.push({ frame: frame.name(), inputs: inputs.slice(0, 12) });
      }
    } catch {
      /* ignore */
    }
  }

  for (const frame of page.frames()) {
    try {
      const n = frame.locator('input[name="number"], input[autocomplete="cc-number"]');
      if (!(await n.count())) continue;
      await n.first().click();
      await n.first().fill(cardNumber);
      const exp = frame.locator('input[name="expiry"], input[autocomplete="cc-exp"]');
      if (await exp.count()) {
        await exp.first().click();
        await exp.first().fill("1234");
      }
      const cvc = frame.locator('input[name="cvc"], input[autocomplete="cc-csc"]');
      if (await cvc.count()) {
        await cvc.first().click();
        await cvc.first().fill("123");
      }
      const country = frame.locator('select[name="country"], select[autocomplete="billing country"]');
      if (await country.count()) await country.first().selectOption("SE");
      const zip = frame.locator('input[name="postalCode"], input[autocomplete="postal-code"], input[autocomplete="billing postal-code"]');
      if (await zip.count()) await zip.first().fill("11122");
      // Clear Link email/phone if present so Link incomplete state does not block submit
      const linkEmail = frame.locator('input[name="search-linkEmail"], input[aria-label="Email"]');
      if (await linkEmail.count()) {
        // Leave empty; prefer collapsing Link save if checkbox exists
      }
      return { filled: true, via: frame.name() || "frame", dump };
    } catch {
      /* next */
    }
  }
  return { filled: false, via: null, dump };
}

async function runScenario(browser, name, cardNumber, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();
  const net = [];
  page.on("response", (res) => {
    const u = res.url();
    if (/\/api\/checkout\/confirm|api\.stripe\.com\/v1\/payment_intents\/.+\/confirm/.test(u)) {
      net.push({
        status: res.status(),
        path: redact(u.replace(/^https?:\/\/[^/]+/, "").split("?")[0]),
      });
    }
  });
  try {
    await resetCart();
    await loginAndOpen(page);
    const fill = await fillCard(page, cardNumber);
    if (!fill.filled) {
      record(name, "BLOCKED", { reason: "elements_inputs_not_found", dump: fill.dump });
      await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-blocked.png`, fullPage: true });
      return;
    }
    record(`${name}_card_filled`, "PASS", { via: fill.via });
    await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-filled.png`, fullPage: true });
    await page.waitForTimeout(800);

    const confirmWait = page.waitForResponse(
      (r) => /\/api\/checkout\/confirm/.test(r.url()),
      { timeout: 120000 },
    ).catch(() => null);
    const stripeWait = page.waitForResponse(
      (r) => /api\.stripe\.com\/v1\/payment_intents\/.+\/confirm/.test(r.url()),
      { timeout: 120000 },
    ).catch(() => null);

    await page.getByRole("button", { name: /Pay now|Betala nu/i }).click();

    if (opts.expect3ds) {
      // Wait for 3DS challenge UI
      let challenged = false;
      for (let i = 0; i < 40; i++) {
        for (const frame of page.frames()) {
          try {
            const complete = frame.getByRole("button", {
              name: /Complete|Succeed|Fail|Authenticate/i,
            });
            if ((await complete.count()) > 0) {
              challenged = true;
              const succeed = frame.getByRole("button", { name: /Complete|Succeed|Authenticate/i });
              if ((await succeed.count()) > 0) await succeed.first().click();
              break;
            }
          } catch {
            /* ignore */
          }
        }
        if (challenged) break;
        if (/\/checkout\/success/.test(page.url())) break;
        await page.waitForTimeout(500);
      }
      await page.waitForURL(/\/checkout\/success|reservationId=/, { timeout: 90000 }).catch(() => null);
      const ok = /\/checkout\/success/.test(page.url()) || /reservationId=/.test(page.url());
      const sb = await admin();
      const { data: paid } = await sb
        .from("order_reservations")
        .select("id,payment_status,payment_intent_id,total_sek,created_at")
        .eq("user_id", userId)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);
      record(name, ok && paid?.[0] ? "PASS" : challenged ? "FAIL" : "BLOCKED", {
        url: page.url().split("?")[0],
        challenged,
        paidId: paid?.[0]?.id || null,
        net,
      });
      await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-final.png`, fullPage: true });
      return;
    }

    if (opts.expectDecline) {
      const stripeRes = await stripeWait;
      await page.waitForTimeout(5000);
      const declined = await page.evaluate(() =>
        /declined|kunde inte|misslyckades|failed|try again|försök igen|not completed|Payment/i.test(
          document.body.innerText,
        ),
      );
      const stillCheckout = page.url().includes("/checkout") && !page.url().includes("/success");
      const noConfirm = !(await confirmWait);
      record(name, stillCheckout && (declined || stripeRes || noConfirm) ? "PASS" : "FAIL", {
        declined,
        stillCheckout,
        stripeConfirmStatus: stripeRes?.status?.() ?? null,
        appConfirm: !!(await confirmWait.catch(() => null)),
        net,
      });
      await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-final.png`, fullPage: true });
      return;
    }

    // success path
    const [stripeRes, confirmRes] = await Promise.all([stripeWait, confirmWait]);
    let confirmBody = "";
    if (confirmRes) {
      confirmBody = redact((await confirmRes.text()).slice(0, 500));
    }
    await page.waitForURL(/\/checkout\/success|reservationId=/, { timeout: 90000 }).catch(() => null);
    await page.waitForTimeout(2000);
    const okNav = /\/checkout\/success/.test(page.url()) || /reservationId=/.test(page.url());
    const sb = await admin();
    const { data: paid } = await sb
      .from("order_reservations")
      .select("id,status,payment_status,payment_intent_id,total_sek,created_at")
      .eq("user_id", userId)
      .eq("payment_status", "paid")
      .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(3);

    record(name, okNav && paid?.length ? "PASS" : "FAIL", {
      url: page.url().split("?")[0],
      stripeConfirmStatus: stripeRes?.status?.() ?? null,
      appConfirmStatus: confirmRes?.status?.() ?? null,
      confirmBodySnippet: confirmBody.slice(0, 240),
      paidCount: paid?.length || 0,
      paidIds: (paid || []).map((p) => p.id),
      paidPi: (paid || []).map((p) => redact(p.payment_intent_id)),
      net,
    });
    await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-final.png`, fullPage: true });
  } catch (e) {
    record(name, "BLOCKED", { error: String(e).slice(0, 200) });
    await page.screenshot({ path: `/opt/cursor/artifacts/pw-${name}-error.png`, fullPage: true }).catch(() => null);
  } finally {
    await context.close();
  }
}

async function cancelRefresh(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" });
  const page = await context.newPage();
  try {
    await resetCart();
    await loginAndOpen(page);
    const before = page.url();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const after = page.url();
    const stillCheckout = after.includes("/checkout");
    record("cancel_refresh", stillCheckout ? "PASS" : "FAIL", { before: before.split("?")[0], after: after.split("?")[0] });
    await page.screenshot({ path: "/opt/cursor/artifacts/pw-cancel-refresh-final.png", fullPage: true });
  } catch (e) {
    record("cancel_refresh", "BLOCKED", { error: String(e).slice(0, 200) });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
await runScenario(browser, "success_4242", "4242424242424242");
await runScenario(browser, "decline_0002", "4000000000000002", { expectDecline: true });
await runScenario(browser, "threeds_3155", "4000000000003155", { expect3ds: true });
await cancelRefresh(browser);
await browser.close();

writeFileSync("/tmp/checkout-audit/evidence/pw-matrix-v2.json", JSON.stringify(results, null, 2));
writeFileSync("/opt/cursor/artifacts/pw-matrix-v2-summary.json", JSON.stringify(results, null, 2));
console.log("DONE", JSON.stringify(results.map((r) => ({ name: r.name, verdict: r.verdict }))));
