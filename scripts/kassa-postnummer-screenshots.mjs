/**
 * Evidence screenshots for postal × fulfillment (Kiruna / Stockholm).
 * Writes to repo artifacts/ (gitignored) + /opt/cursor/artifacts/.
 * Never commit. TEST only — msdfjrrokcmjifetuwgc via .env.local.
 *
 * node scripts/kassa-postnummer-screenshots.mjs
 */
import { chromium, devices } from "playwright";
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

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-postnummer");
const OUT_OPT = "/opt/cursor/artifacts/kassa-postnummer";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-postnummer";
for (const d of [OUT_REPO, OUT_OPT, OUT_STORE]) mkdirSync(d, { recursive: true });

function freshEmail(prefix) {
  return `kassa.postal+${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function shot(page, name) {
  for (const dir of [OUT_REPO, OUT_OPT, OUT_STORE]) {
    const p = join(dir, name);
    if (existsSync(p)) unlinkSync(p);
    await page.screenshot({ path: p, fullPage: false });
  }
  const buf = readFileSync(join(OUT_REPO, name));
  const hash = createHash("md5").update(buf).digest("hex");
  console.log("shot", name, hash.slice(0, 8), statSync(join(OUT_REPO, name)).size);
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

async function fillPostalAndWait(page, postal) {
  const input = page.locator("#checkout-postal");
  if ((await input.count()) === 0 || !(await input.isVisible().catch(() => false))) {
    // Locked postal display → click Redigera
    const edit = page.getByRole("button", { name: /Ändra|Redigera|Edit/i }).first();
    if (await edit.count()) {
      await edit.click();
      await page.waitForTimeout(400);
    }
  }
  await page.waitForSelector("#checkout-postal", { timeout: 45000 });
  await page.fill("#checkout-postal", "");
  await page.fill("#checkout-postal", postal);
  await page.waitForTimeout(2500);
}

async function fillContact(page, city) {
  await page.waitForSelector("#checkout-fullName", { timeout: 45000 });
  await page.fill("#checkout-fullName", "Test Syntetisk");
  await page.fill("#checkout-email", freshEmail(city.toLowerCase()));
  await page.fill("#checkout-phone", "0701234567");
  await page.fill("#checkout-street", "Testgatan 1");
  await page.fill("#checkout-city", city);
  await page.waitForTimeout(1500);
}

async function runViewport(label, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
  });
  await seedCart(context);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });

  // Kiruna step 1 — options (shared unavailable, direct selected)
  await fillPostalAndWait(page, "98131");
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Direktleverans/i.test(t) &&
          (/ej tillgänglig|inte tillgänglig|utanför/i.test(t) ||
            /Delad pall/i.test(t))
        );
      },
      { timeout: 25000 },
    );
  } catch {
    console.warn(label, "kiruna options wait soft-fail");
  }
  await shot(page, `${label}-kiruna-steg1.png`);

  // Stockholm step 1 — both options (wait until zone loading finishes)
  await fillPostalAndWait(page, "11151");
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Uppdaterar leverans/i.test(t)) return false;
        // Shared must be selectable again (not the out-of-zone explanation).
        return (
          /Delad pall/i.test(t) &&
          /Direktleverans/i.test(t) &&
          !/utanför leveranszonen/i.test(t) &&
          (/99\s*kr/i.test(t) || /leverans inom 30 dagar/i.test(t))
        );
      },
      { timeout: 45000 },
    );
  } catch {
    console.warn(label, "stockholm options wait soft-fail");
  }
  await page.waitForTimeout(800);
  await shot(page, `${label}-stockholm-steg1.png`);

  // Kiruna summary with direct selected
  await fillPostalAndWait(page, "98131");
  await fillContact(page, "Kiruna");
  // Expand order summary on mobile
  const toggle = page.locator('[data-testid="checkout-order-summary-toggle"]');
  if (await toggle.count()) {
    const expanded = await page
      .locator('[data-testid="checkout-order-summary-body"]')
      .isVisible()
      .catch(() => false);
    if (!expanded) await toggle.click().catch(() => {});
  }
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return /Direktleverans|5–10 arbetsdagar|149/i.test(t);
      },
      { timeout: 20000 },
    );
  } catch {
    console.warn(label, "kiruna summary wait soft-fail");
  }
  // Scroll summary into view if present
  await page
    .locator('[data-testid="checkout-order-summary-body"]')
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await shot(page, `${label}-kiruna-sammanfattning.png`);

  await browser.close();
}

async function main() {
  await runViewport("390", { width: 390, height: 844 });
  await runViewport("1440", { width: 1440, height: 900 });
  writeFileSync(
    join(OUT_REPO, "README.txt"),
    "Screenshots for PR postal×fulfillment. Do not commit.\n",
  );
  console.log("done →", OUT_REPO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
