/**
 * Evidence: guest Ändra dialog (postal/address) — open, after save, after 41101.
 * artifacts/kassa-andra-dialog-gast/v1/ — never commit.
 *
 * APP_URL=http://127.0.0.1:3000 node scripts/kassa-andra-dialog-gast-v1-screenshots.mjs
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
  "kassa-andra-dialog-gast",
  "v1",
);
const OUT_OPT = "/opt/cursor/artifacts/kassa-andra-dialog-gast/v1";
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
  await page.waitForTimeout(400);
  for (const dir of [OUT_REPO, OUT_OPT]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const walk = join(OUT_WALK, `kassa_andra_dialog_gast_${name}`);
  if (existsSync(walk)) unlinkSync(walk);
  await page.screenshot({ path: walk, fullPage: false });
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
  });
  console.log("shot", name, md5.slice(0, 8), bytes);
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  if (!res.ok()) throw new Error(`cart seed failed: ${res.status()}`);
  await page.close();
}

async function fillGuestComplete(page, email) {
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
  await tryFill(/namn|full(?:t)?\s*namn|name/i, "Gast Andra Syntetisk");
  await tryFill(/telefon|phone/i, "0701234567");
  await tryFill(/e-post|email/i, email);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(2000);

  // Wait until address summary / Ändra is available
  await page.waitForSelector('[data-testid="checkout-postal-edit"]', {
    timeout: 60000,
  });
}

async function openAndraDialog(page) {
  await page.getByTestId("checkout-postal-edit").click();
  await page.waitForSelector("#full_name", { timeout: 15000 });
  await page.waitForTimeout(500);
}

async function runWidth(browser, width) {
  const context = await browser.newContext({
    viewport: { width, height: width === 390 ? 900 : 1000 },
    locale: "sv-SE",
  });
  await seedCart(context);
  const page = await context.newPage();
  const email = `gast.andra.${width}+${Date.now()}@example.com`;
  await fillGuestComplete(page, email);

  // 1) Dialog open — must show filled guest fields, no profile incomplete copy
  await openAndraDialog(page);
  const openText = await page.evaluate(() => document.body?.innerText || "");
  if (/Hemadressen i profilen|Home address on profile/i.test(openText)) {
    throw new Error("Profile incomplete copy visible for guest");
  }
  const nameVal = await page.locator("#full_name").inputValue();
  const emailVal = await page.locator("#email").inputValue();
  if (!nameVal || !emailVal) {
    throw new Error(`Dialog not prefilled: name=${nameVal} email=${emailVal}`);
  }
  await shot(page, `andra_dialog_open_${width}.png`, {
    case: "andra_dialog_open",
    viewport: width,
    user: "guest_synthetic",
    notes: "Ändra open with guest name/email/phone/address prefilled",
  });

  const dialogSave = () =>
    page.locator('[role="dialog"]').getByRole("button", { name: /Spara|Save/i });

  // 2) One Save closes dialog; values remain in checkout
  const addressInput = page.locator("#address");
  await addressInput.click({ clickCount: 3 });
  await page.keyboard.press("Backspace");
  await addressInput.pressSequentially("Kungsgatan 2", { delay: 20 });
  await addressInput.blur();
  await page.waitForTimeout(200);
  await dialogSave().click();
  await page.waitForSelector("#full_name", { state: "hidden", timeout: 15000 });
  await page.waitForTimeout(1500);
  const afterSave = await page.evaluate(() => document.body?.innerText || "");
  if (/Hemadressen i profilen|Kunde inte uppdatera leveransalternativ/i.test(afterSave)) {
    throw new Error("Profile/zone error after guest save");
  }
  if (!/Kungsgatan 2/i.test(afterSave)) {
    throw new Error("Saved street not visible in checkout after one Spara");
  }
  await shot(page, `andra_dialog_after_save_${width}.png`, {
    case: "andra_dialog_after_save",
    viewport: width,
    user: "guest_synthetic",
    notes: "One Spara closed dialog; Kungsgatan 2 visible; no wipe",
  });

  // 3) Change postal to 41101 via Ändra
  await openAndraDialog(page);
  await page.locator("#postal_code").fill("41101");
  await page.locator("#city").fill("Göteborg");
  await page.locator("#address").fill("Avenyn 1");
  await dialogSave().click();
  await page.waitForSelector("#full_name", { state: "hidden", timeout: 15000 });
  await page.waitForTimeout(2500);
  const after41101 = await page.evaluate(() => document.body?.innerText || "");
  if (!/41101/.test(after41101)) {
    throw new Error("41101 not visible after save");
  }
  if (/Hemadressen i profilen|Kunde inte uppdatera leveransalternativ/i.test(after41101)) {
    throw new Error("Errors after 41101 save");
  }
  await shot(page, `andra_dialog_after_41101_${width}.png`, {
    case: "andra_dialog_after_41101",
    viewport: width,
    user: "guest_synthetic",
    notes: "After switch to 41101 Göteborg; fields retained",
  });

  await context.close();
}

async function main() {
  requireTestEnv();
  console.log("branch", BRANCH, HEAD, "base", BASE);
  const browser = await chromium.launch({ headless: true });
  for (const width of [390, 1440]) {
    await runWidth(browser, width);
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
