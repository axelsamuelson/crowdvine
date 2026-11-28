/**
 * Evidence: address form stays while city focused; summary after blur; same after F5.
 * Bug: seed cleared deliveryDraft while city focused → stuck "Laddar vinzon…".
 * artifacts/kassa-vinzon/v1/ — never commit.
 *
 * TEST only — msdfjrrokcmjifetuwgc. Guest synthetic. No auth emails. No prod.
 *
 * APP_URL=http://127.0.0.1:3000 node scripts/kassa-vinzon-v1-screenshots.mjs
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
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-vinzon", "v1");
const OUT_OPT = "/opt/cursor/artifacts/kassa-vinzon/v1";
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
  const pk =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY ||
    "";
  if (pk && !pk.startsWith("pk_test")) {
    throw new Error("Refusing: Stripe publishable key is not test mode");
  }
}

async function shot(page, name, meta, { keepFocus = false } = {}) {
  const captured_at = new Date().toISOString();
  if (!keepFocus) {
    await page.evaluate(() => {
      const heading = [...document.querySelectorAll("h2")].find((el) =>
        /Leveransadress|Delivery address/i.test(el.textContent || ""),
      );
      heading?.scrollIntoView({ block: "start" });
    });
    await page.waitForTimeout(450);
  } else {
    // Keep city focused — scrollIntoView on other nodes can blur and collapse.
    await page.evaluate(() => {
      const city = document.querySelector("#checkout-city");
      city?.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await page.waitForTimeout(200);
  }
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const walk = join(OUT_WALK, `kassa_vinzon_${name}`);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, fullPage: false });
  const buf = readFileSync(join(OUT_REPO, name));
  const md5 = createHash("md5").update(buf).digest("hex");
  const bytes = statSync(join(OUT_REPO, name)).size;
  manifestRows.push({
    file: name,
    ...meta,
    captured_at,
    md5,
    bytes,
    head_sha: HEAD,
    branch: BRANCH,
  });
  console.log("shot", name, md5.slice(0, 8), bytes);
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) {
    throw new Error(`cart seed failed: ${res.status()} ${await res.text()}`);
  }
  await page.close();
}

function cityInput(page) {
  return page.locator("#checkout-city");
}

async function assertNoSpinner(page) {
  const text = await page.evaluate(() => document.body?.innerText || "");
  if (/Laddar vinzon/i.test(text)) {
    throw new Error("Stuck spinner 'Laddar vinzon…' visible");
  }
}

async function fillThroughStreetKeepCityFocus(page, email) {
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", { timeout: 90000 });
  await page.waitForTimeout(800);

  const postal = page.locator("#checkout-postal");
  await postal.click({ force: true });
  await postal.fill("");
  await postal.type("11151", { delay: 40 });
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2500);

  const fill = async (id, value) => {
    const loc = page.locator(`#checkout-${id}`);
    await loc.waitFor({ state: "visible", timeout: 60000 });
    await loc.click();
    await loc.fill(value);
  };

  await fill("fullName", "Gast Vinzon Syntetisk");
  await fill("email", email);
  await fill("phone", "0701234567");
  await fill("street", "Drottninggatan 1");

  // Fill city last and KEEP focus — this is the race the bug hung on.
  const city = cityInput(page);
  await city.waitFor({ state: "visible", timeout: 30000 });
  await city.click();
  await city.fill("");
  await city.type("Stockholm", { delay: 50 });
  // Do not blur yet — wait for ensure-session / zone-addresses to settle
  // while keeping the draft mounted (the bug cleared draft during this window).
  await page.waitForTimeout(2500);
  await assertNoSpinner(page);
  // Force focus back onto city so shot (a) proves the form stays with focus.
  await city.click();
  await page.waitForTimeout(200);
  const stillFocused = await city.evaluate(
    (el) => document.activeElement === el,
  );
  if (!stillFocused) {
    throw new Error("City field lost focus before focused-form screenshot");
  }
  const formVisible = await city.isVisible();
  if (!formVisible) {
    throw new Error("Address form unmounted while city still focused");
  }
  await assertNoSpinner(page);
}

async function runWidth(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 900 : 1000 },
    locale: "sv-SE",
  });
  await seedCart(context);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const email = `gast.vinzon.${width}+${Date.now()}@example.com`;

  await fillThroughStreetKeepCityFocus(page, email);

  await shot(
    page,
    `a_form_while_city_focused_${width}.png`,
    {
      case: "a_form_while_city_focused",
      viewport: width,
      user: "guest_synthetic",
      notes:
        "City field focused after zone complete; form still mounted; no spinner",
    },
    { keepFocus: true },
  );

  // Blur → summary should appear (seed may clear draft only after blur).
  // If summary already visible (focus lost during settle), skip blur.
  const city = cityInput(page);
  if ((await city.count()) > 0 && (await city.isVisible())) {
    await city.blur();
    await page.waitForTimeout(800);
  }
  await page.waitForSelector('[data-testid="checkout-address-edit"]', {
    timeout: 60000,
  });
  await assertNoSpinner(page);
  await shot(page, `b_summary_after_blur_${width}.png`, {
    case: "b_summary_after_blur",
    viewport: width,
    user: "guest_synthetic",
    notes: "After city blur; address summary visible; no Laddar vinzon",
  });

  // F5 — same flow after reload (regression of stuck spinner after refresh).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  // After reload with complete zone row, summary or form — never permanent spinner.
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      if (/Laddar vinzon/i.test(t)) return false;
      return (
        Boolean(document.querySelector('[data-testid="checkout-address-edit"]')) ||
        Boolean(document.querySelector("#checkout-city"))
      );
    },
    { timeout: 90000 },
  );
  await assertNoSpinner(page);
  await shot(page, `c_after_f5_${width}.png`, {
    case: "c_after_f5",
    viewport: width,
    user: "guest_synthetic",
    notes: "After F5; address step recovered without permanent spinner",
  });

  await context.close();
}

async function main() {
  requireTestEnv();
  if (
    !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
    process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY
  ) {
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY =
      process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY;
  }
  console.log("branch", BRANCH, HEAD, "base", BASE);
  const browser = await chromium.launch({ headless: true });
  for (const width of [390, 1440]) {
    await runWidth(browser, width);
  }
  await browser.close();
  const manifest = {
    generated_at: new Date().toISOString(),
    head_sha: HEAD,
    branch: BRANCH,
    base: BASE,
    test_project: "msdfjrrokcmjifetuwgc",
    user: "guest_synthetic",
    shots: manifestRows,
  };
  writeFileSync(join(OUT_REPO, "manifest.json"), JSON.stringify(manifest, null, 2));
  writeFileSync(join(OUT_OPT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("manifest written", OUT_REPO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
