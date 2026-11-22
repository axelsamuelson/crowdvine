/**
 * Camille guest reload → login wall evidence + fix proof (TEST only).
 * artifacts/kassa-gast-reload-login/v1/ — never commit.
 *
 * Flow:
 * 1) Guest ensure-session for a brand-new synthetic email → Stripe / payment UI
 * 2) Drop Supabase auth cookies (keep guest proof) + reload
 * 3) Re-enter same email → remint (no "Skicka inloggningslänk")
 *
 * APP_URL=http://localhost:3000 node scripts/kassa-gast-reload-login-v1-screenshots.mjs
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

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(
  process.cwd(),
  "artifacts",
  "kassa-gast-reload-login",
  "v1",
);
const OUT_OPT = "/opt/cursor/artifacts/kassa-gast-reload-login/v1";
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

async function shot(page, name, meta) {
  const captured_at = new Date().toISOString();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: true });
  }
  // Also copy key shots into walkthrough root with descriptive names
  const walk = join(OUT_WALK, name);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, fullPage: true });
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  const bytes = statSync(join(OUT_REPO, name)).size;
  manifestRows.push({
    file: name,
    ...meta,
    captured_at,
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
  if (!res.ok()) {
    throw new Error(`batch-add ${res.status()} ${await res.text()}`);
  }
  await page.close();
}

function isSupabaseAuthCookieName(name) {
  return (
    name.startsWith("sb-") &&
    (name.includes("-auth-token") ||
      name.includes("code-verifier") ||
      name.includes("auth-token"))
  );
}

async function fillGuestCheckout(page, email) {
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", { timeout: 90000 });
  await page.waitForTimeout(800);

  const postal = page.locator("#checkout-postal");
  await postal.click({ force: true });
  await postal.fill("");
  await postal.type("11151", { delay: 40 });
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);

  // Progressive address fields appear after postal
  const tryFill = async (re, value) => {
    const loc = page.getByLabel(re).first();
    if ((await loc.count()) === 0) return;
    try {
      await loc.fill(value);
    } catch {
      /* skip */
    }
  };
  await tryFill(/gata|street|adressrad|adress/i, "Drottninggatan 1");
  await tryFill(/^ort$|stad|city/i, "Stockholm");
  await tryFill(/namn|full(?:t)?\s*namn|name/i, "Gast Reload Syntetisk");
  await tryFill(/telefon|phone/i, "0701234567");
  await tryFill(/e-post|email/i, email);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);

  for (const re of [/jag är|ålder|20 år|age/i, /villkor|terms|godkänner/i]) {
    const box = page.getByRole("checkbox", { name: re }).first();
    if ((await box.count()) > 0) {
      try {
        await box.check({ force: true });
      } catch {
        /* optional */
      }
    }
  }
}

async function openPaymentStep(page) {
  // DOB unlocks "Fortsätt till betalkort"
  const dob = page.getByLabel(/födelsedatum|date of birth|födelse/i).first();
  if ((await dob.count()) > 0) {
    await dob.fill("1990-01-15");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
  }
  const cont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to (card|payment)/i,
  });
  if ((await cont.count()) > 0) {
    await cont.click({ force: true });
  }
  await page.waitForTimeout(2000);
}

async function waitPaymentReady(page) {
  // Steg 4: Stripe / preparing — NEVER the OTP send-link CTA
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";
      if (/Skicka inloggningslänk/i.test(text)) return false;
      return (
        !!document.querySelector("iframe[name^='__privateStripeFrame']") ||
        /Förbereder kassan|Betalkort|Kort|Payment Element|Köp och godkänn/i.test(
          text,
        )
      );
    },
    { timeout: 120000 },
  );
  const text = await page.evaluate(() => document.body?.innerText || "");
  if (/Skicka inloggningslänk/i.test(text)) {
    throw new Error("Login wall visible — ensure-session remint failed");
  }
}

async function main() {
  requireTestEnv();
  const stamp = Date.now();
  const email = `gast.reload+${stamp}@example.com`;
  console.log("synthetic email", email);
  console.log("branch", BRANCH, HEAD.slice(0, 8), "base", BASE);

  // API proof first (cookie jar)
  const apiPage = await (await chromium.launch({ headless: true })).newPage();
  const first = await apiPage.request.post(`${BASE}/api/checkout/ensure-session`, {
    data: { email },
    failOnStatusCode: false,
  });
  const firstBody = await first.json();
  console.log("ensure-session #1", first.status(), {
    autoSignedIn: firstBody.autoSignedIn,
    reminted: firstBody.reminted,
  });
  if (first.status() !== 200 || !firstBody.session) {
    throw new Error(`ensure-session #1 failed: ${JSON.stringify(firstBody)}`);
  }
  const cookies = await apiPage.context().cookies();
  const proof = cookies.find((c) => c.name === "pact_checkout_guest_proof");
  if (!proof?.value) {
    throw new Error("Missing pact_checkout_guest_proof cookie after signup");
  }
  // Drop auth cookies, keep proof — simulates lost Supabase session on reload
  const keep = cookies.filter((c) => !isSupabaseAuthCookieName(c.name));
  await apiPage.context().clearCookies();
  await apiPage.context().addCookies(keep);
  const second = await apiPage.request.post(`${BASE}/api/checkout/ensure-session`, {
    data: { email },
    failOnStatusCode: false,
  });
  const secondBody = await second.json();
  console.log("ensure-session #2 (proof only)", second.status(), {
    autoSignedIn: secondBody.autoSignedIn,
    reminted: secondBody.reminted,
  });
  if (second.status() !== 200 || !secondBody.reminted) {
    throw new Error(
      `ensure-session remint failed: ${second.status()} ${JSON.stringify(secondBody)}`,
    );
  }
  // Without proof → 409
  await apiPage.context().clearCookies();
  const third = await apiPage.request.post(`${BASE}/api/checkout/ensure-session`, {
    data: { email },
    failOnStatusCode: false,
  });
  const thirdBody = await third.json();
  console.log("ensure-session #3 (no proof)", third.status(), thirdBody);
  if (third.status() !== 409 || !thirdBody.requiresLogin) {
    throw new Error("expected 409 without proof for existing email");
  }
  await apiPage.context().browser()?.close();

  writeFileSync(
    join(OUT_REPO, "api-reload-proof.json"),
    JSON.stringify(
      {
        email,
        first: { status: first.status(), autoSignedIn: firstBody.autoSignedIn },
        second: {
          status: second.status(),
          reminted: secondBody.reminted,
        },
        third: { status: third.status(), requiresLogin: thirdBody.requiresLogin },
        branch: BRANCH,
        head: HEAD,
      },
      null,
      2,
    ),
  );

  // UI screenshots (390 + 1440) — use a second synthetic email for clean UI
  const uiEmail = `gast.reload.ui+${stamp}@example.com`;
  const browser = await chromium.launch({ headless: true });

  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      locale: "sv-SE",
    });
    await seedCart(context);
    const page = await context.newPage();
    await fillGuestCheckout(page, uiEmail);
    await page.waitForTimeout(3000);
    await openPaymentStep(page);
    await waitPaymentReady(page);
    await shot(page, `before_reload_${width}.png`, {
      case: "before_reload_steg4",
      viewport: width,
      user: "guest_synthetic",
      notes: "Steg 4 after first ensure-session — no OTP wall",
    });

    // Drop Supabase auth cookies only; keep guest proof + cart cookies
    // (Camille: auth session gone on reload, cart/proof remain).
    const all = await context.cookies();
    const proofCookie = all.find((c) => c.name === "pact_checkout_guest_proof");
    if (!proofCookie?.value) {
      throw new Error(`No guest proof cookie after first ensure-session (${width})`);
    }
    const kept = all.filter((c) => !isSupabaseAuthCookieName(c.name));
    await context.clearCookies();
    await context.addCookies(
      kept.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || "/",
        httpOnly: !!c.httpOnly,
        secure: !!c.secure,
        sameSite: /** @type {'Lax'|'Strict'|'None'} */ (
          c.sameSite === "None" ? "None" : c.sameSite === "Strict" ? "Strict" : "Lax"
        ),
      })),
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    // Cart may require re-seed if cookie jar lost cart id
    try {
      await page.waitForSelector("#checkout-postal", { timeout: 15000 });
    } catch {
      await seedCart(context);
      await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
    }
    await fillGuestCheckout(page, uiEmail);
    await page.waitForTimeout(3000);
    await openPaymentStep(page);
    await waitPaymentReady(page);
    const bodyText = await page.evaluate(() => document.body?.innerText || "");
    if (/Skicka inloggningslänk/i.test(bodyText)) {
      throw new Error(`Login wall after reload at ${width}px`);
    }
    await shot(page, `after_reload_remint_${width}.png`, {
      case: "after_reload_remint_steg4",
      viewport: width,
      user: "guest_synthetic",
      notes:
        "Steg 4 after reload+same email with proof — reminted, no OTP wall",
    });
    await context.close();
  }

  await browser.close();

  writeFileSync(
    join(OUT_REPO, "manifest.json"),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        branch: BRANCH,
        head: HEAD,
        base: BASE,
        shots: manifestRows,
      },
      null,
      2,
    ),
  );
  console.log("done", manifestRows.length, "shots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
