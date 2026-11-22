/**
 * #310 evidence: guest Steg 4 first visit (no reload) — Stripe fields + error UI.
 * artifacts/kassa-gast-steg4-forsta/v1/ — never commit.
 *
 * APP_URL=http://127.0.0.1:3000 node scripts/kassa-gast-steg4-forsta-v1-screenshots.mjs
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

const BASE = process.env.APP_URL || "http://127.0.0.1:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(
  process.cwd(),
  "artifacts",
  "kassa-gast-steg4-forsta",
  "v1",
);
const OUT_OPT = "/opt/cursor/artifacts/kassa-gast-steg4-forsta/v1";
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
  // Scroll Steg 4 into view — fullPage often blanks cross-origin Stripe iframes.
  await page.evaluate(() => {
    const heading = [...document.querySelectorAll("h2, h3, p, div")].find(
      (el) => /^4\.\s*Betalkort/i.test((el.textContent || "").trim()),
    );
    (heading || document.querySelector('[data-testid="checkout-card-charge-timing"]'))
      ?.scrollIntoView({ block: "start" });
  });
  await page.waitForTimeout(500);
  // Prefer clipping around the tall PE iframe when present
  const peBox = await page.evaluate(() => {
    const f = [...document.querySelectorAll("iframe")].find((el) => {
      if (!/^__privateStripeFrame/i.test(el.name || "")) return false;
      const r = el.getBoundingClientRect();
      return r.height > 100 && r.width > 100;
    });
    if (!f) return null;
    const r = f.getBoundingClientRect();
    const padTop = 120;
    const padBottom = 80;
    return {
      x: 0,
      y: Math.max(0, r.top - padTop),
      width: Math.min(window.innerWidth, Math.max(r.width + 40, 360)),
      height: Math.min(
        window.innerHeight,
        Math.round(r.height + padTop + padBottom),
      ),
    };
  });
  const shotOpts = peBox
    ? { clip: peBox }
    : { fullPage: false };
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, ...shotOpts });
  }
  const walk = join(OUT_WALK, `kassa_gast_steg4_forsta_${name}`);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, ...shotOpts });
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  const bytes = statSync(join(OUT_REPO, name)).size;
  manifestRows.push({
    file: name,
    navigation_type: "first_visit",
    ...meta,
    captured_at,
    md5,
    bytes,
    head: HEAD,
    branch: BRANCH,
    pe_clip: Boolean(peBox),
  });
  console.log("shot", name, md5.slice(0, 8), bytes, peBox ? "pe-clip" : "viewport");
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) throw new Error(`cart seed failed: ${res.status()}`);
  await page.close();
}

async function fillGuestToCompliance(page, email) {
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", { timeout: 90000 });
  await page.waitForTimeout(800);
  const postal = page.locator("#checkout-postal");
  await postal.click({ force: true });
  await postal.fill("");
  await postal.type("11151", { delay: 40 });
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);

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
  await tryFill(/namn|full(?:t)?\s*namn|name/i, "Gast Steg4 Syntetisk");
  await tryFill(/telefon|phone/i, "0701234567");
  await tryFill(/e-post|email/i, email);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);

  // Age DOB — use #age-dob; avoid /ålder/ which matches fulfillment radios
  const dob = page.locator("#age-dob");
  if ((await dob.count()) > 0) {
    await dob.fill("1990-01-15");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(400);
  } else {
    const labeled = page.getByLabel(/födelsedatum|date of birth|födelse/i).first();
    if ((await labeled.count()) > 0) {
      await labeled.fill("1990-01-15");
      await page.keyboard.press("Tab");
    }
  }

  for (const re of [/jag är|20 år|villkor|terms|godkänner/i]) {
    const box = page.getByRole("checkbox", { name: re }).first();
    if ((await box.count()) > 0) {
      try {
        await box.check({ force: true });
      } catch {
        /* optional */
      }
    }
  }
  // Fallback: terms checkbox by id
  const terms = page.locator("#terms-accept");
  if ((await terms.count()) > 0) {
    await terms.check({ force: true }).catch(async () => {
      await page.locator('button#terms-accept, [id="terms-accept"]').first().click({ force: true });
    });
  }
  await page.waitForTimeout(500);

  const cont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to (card|payment)/i,
  });
  if ((await cont.count()) > 0) {
    await cont.click({ force: true });
  }
  await page.waitForTimeout(2000);
}

async function selectChannel(page, channel) {
  const name =
    channel === "direct" ? /Direktleverans/i : /Delad pall/i;
  const radio = page.getByRole("radio", { name });
  if ((await radio.count()) === 0) return;
  if (!(await radio.isChecked())) {
    await radio.click({ force: true });
    await page.waitForTimeout(1500);
  }
}

async function waitStripeFields(page) {
  // Require PE ready: loading gone + tall __privateStripeFrame (not 1px metrics).
  await page.waitForFunction(
    () => {
      const body = document.body?.innerText || "";
      if (/Kunde inte förbereda/i.test(body) && /Försök igen/i.test(body)) {
        return true;
      }
      if (document.querySelector('[data-testid="checkout-stripe-loading"]')) {
        return false;
      }
      if (/Förbereder betalning|Laddar betalning/i.test(body)) return false;
      return [...document.querySelectorAll("iframe")].some((f) => {
        if (!/^__privateStripeFrame/i.test(f.name || "")) return false;
        const r = f.getBoundingClientRect();
        return r.height > 100 && r.width > 100;
      });
    },
    { timeout: 120000 },
  );
  await page.waitForTimeout(2000);

  let filled = false;
  for (let attempt = 0; attempt < 5 && !filled; attempt++) {
    for (const frame of page.frames()) {
      try {
        const num = frame.locator('input[name="number"]');
        if ((await num.count()) === 0) continue;
        await num.first().click({ timeout: 3000 });
        await num.first().fill("4242424242424242");
        await frame.locator('input[name="expiry"]').first().fill("1234");
        await frame.locator('input[name="cvc"]').first().fill("123");
        const postal = frame.locator('input[name="postalCode"]');
        if ((await postal.count()) > 0) {
          await postal.first().fill("11151");
        }
        filled = true;
        break;
      } catch {
        /* retry */
      }
    }
    if (!filled) await page.waitForTimeout(800);
  }
  if (!filled) {
    throw new Error("Stripe card inputs not fillable — PE not ready");
  }
  await page.waitForTimeout(800);
}

async function runHappy(browser, width, channel) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 900 : 1000 },
    locale: "sv-SE",
  });
  await seedCart(context);
  const page = await context.newPage();
  const email = `gast.steg4.${channel}.${width}+${Date.now()}@example.com`;
  await fillGuestToCompliance(page, email);
  await selectChannel(page, channel);
  // Re-open payment step if channel change collapsed it
  const cont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to card/i,
  });
  if ((await cont.count()) > 0 && (await cont.isVisible())) {
    await cont.click().catch(() => {});
  }
  await waitStripeFields(page);
  await shot(page, `first_visit_steg4_${channel}_${width}.png`, {
    case: `first_visit_steg4_${channel}`,
    viewport: width,
    channel,
    user: "guest_synthetic",
    notes: "No reload; Stripe fields visible after ensure-session",
  });
  await context.close();
}

async function runErrorTimeout(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 900 : 1000 },
    locale: "sv-SE",
  });
  await seedCart(context);
  const page = await context.newPage();
  // Force ensure-session to hang past client timeout
  await page.route("**/api/checkout/ensure-session", async (route) => {
    await new Promise((r) => setTimeout(r, 20_000));
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "forced_timeout_test" }),
    });
  });
  const email = `gast.steg4.err.${width}+${Date.now()}@example.com`;
  await fillGuestToCompliance(page, email);
  await page.waitForSelector("text=Försök igen", { timeout: 25000 });
  await shot(page, `first_visit_steg4_error_${width}.png`, {
    case: "first_visit_steg4_error",
    viewport: width,
    user: "guest_synthetic",
    notes: "ensure-session timeout/error shows Försök igen (no eternal spinner)",
  });
  await context.close();
}

async function main() {
  requireTestEnv();
  console.log("branch", BRANCH, HEAD, "base", BASE);
  const browser = await chromium.launch({ headless: true });
  for (const width of [390, 1440]) {
    await runHappy(browser, width, "shared");
    await runHappy(browser, width, "direct");
    await runErrorTimeout(browser, width);
  }
  await browser.close();
  const manifest = {
    generated_at: new Date().toISOString(),
    branch: BRANCH,
    head: HEAD,
    base: BASE,
    navigation_type: "first_visit",
    shots: manifestRows,
  };
  writeFileSync(join(OUT_REPO, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(join(OUT_OPT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("done", manifestRows.length, "shots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
