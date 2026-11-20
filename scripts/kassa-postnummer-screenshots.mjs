/**
 * Evidence screenshots for postal × fulfillment (Kiruna / Stockholm).
 * Writes to repo artifacts/ (gitignored) + /opt/cursor/artifacts/.
 * Never commit. TEST only — msdfjrrokcmjifetuwgc via .env.local.
 *
 * node scripts/kassa-postnummer-screenshots.mjs
 *
 * Output roots use artifacts/kassa-postnummer/v2/ (existing basenames kept).
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

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT_REPO = join(process.cwd(), "artifacts", "kassa-postnummer", "v2");
const OUT_OPT = "/opt/cursor/artifacts/kassa-postnummer/v2";
const OUT_STORE = "/cursor/stores/self/artifacts/kassa-postnummer/v2";
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
  await dob.waitFor({ state: "visible", timeout: 25000 });
  await dob.fill("");
  await dob.pressSequentially("19900115", { delay: 20 });
  await dob.blur();
  await page.waitForTimeout(300);
}

async function fill4242(page) {
  for (const frame of page.frames()) {
    const num = frame.locator(
      'input[name="number"], input[autocomplete="cc-number"]',
    );
    if ((await num.count()) === 0) continue;
    await num.first().fill("4242424242424242");
    const exp = frame.locator(
      'input[name="expiry"], input[autocomplete="cc-exp"]',
    );
    if (await exp.count()) await exp.first().fill("1234");
    const cvc = frame.locator(
      'input[name="cvc"], input[autocomplete="cc-csc"]',
    );
    if (await cvc.count()) await cvc.first().fill("123");
    return true;
  }
  return false;
}

async function waitPe(page) {
  for (let i = 0; i < 45; i++) {
    const t = await page.locator("body").innerText();
    const err = /leverantör av betaltjänster|Unacceptable TLS|kunde inte laddas/i.test(
      t,
    );
    let card = false;
    for (const f of page.frames()) {
      if (
        (await f
          .locator('input[name="number"], input[autocomplete="cc-number"]')
          .count()
          .catch(() => 0)) > 0
      ) {
        card = true;
        break;
      }
    }
    if (card) return { ok: true, err: false };
    if (err && i > 8) return { ok: false, err: true };
    await page.waitForTimeout(1000);
  }
  return { ok: false, err: false };
}

async function reachKirunaPayment(page, label) {
  await fillPostalAndWait(page, "98131");
  await fillContact(page, "Kiruna");
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Direktleverans/i.test(t) &&
          !/saknar fraktregion|noPickupForCart|Kontakta support/i.test(t)
        );
      },
      { timeout: 25000 },
    );
  } catch {
    console.warn(label, "kiruna delivery clean wait soft-fail");
  }

  // Age / terms → Fortsätt till betalkort
  try {
    await fillDob(page);
    await acceptTerms(page);
  } catch (e) {
    console.warn(label, "dob/terms soft-fail", String(e).slice(0, 120));
  }

  const cont = page.getByRole("button", {
    name: /Fortsätt till betalkort|Continue to payment/i,
  });
  for (let i = 0; i < 25 && !(await cont.isEnabled().catch(() => false)); i++) {
    await acceptTerms(page);
    await page.waitForTimeout(250);
  }
  if (await cont.count()) {
    await cont.click({ force: true }).catch(() => {});
  }

  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Kortnummer|Card number|Betalkort/i.test(t) &&
          !/Bekräfta ålder och tryck fortsätt/i.test(t) &&
          !/saknar fraktregion/i.test(t)
        );
      },
      { timeout: 25000 },
    );
  } catch {
    console.warn(label, "PE unlock wait soft-fail");
  }

  const pe = await waitPe(page);
  console.log(label, "pe", pe);
  if (pe.ok) {
    await fill4242(page);
    await page.waitForTimeout(1200);
  }

  // Card step in lower half of viewport
  await page
    .locator("text=Betalkort")
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll("h2,h3,p,span")).find((n) =>
      /Betalkort/i.test(n.textContent || ""),
    );
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo(0, Math.max(0, y));
    }
  });
  await page.waitForTimeout(400);
}

async function runViewport(label, viewport) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    viewport,
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
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

  // Stockholm step 1 — both options
  await fillPostalAndWait(page, "11151");
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        if (/Uppdaterar leverans/i.test(t)) return false;
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

  // Kiruna summary with direct selected (no red fraktregion)
  await fillPostalAndWait(page, "98131");
  await fillContact(page, "Kiruna");
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
        return (
          /Direktleverans|5–10 arbetsdagar|149/i.test(t) &&
          !/saknar fraktregion/i.test(t)
        );
      },
      { timeout: 20000 },
    );
  } catch {
    console.warn(label, "kiruna summary wait soft-fail");
  }
  await page
    .locator('[data-testid="checkout-order-summary-body"]')
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await shot(page, `${label}-kiruna-sammanfattning.png`);

  // Kiruna step 4 — Betalkort with card field + filled 4242
  await reachKirunaPayment(page, label);
  await shot(page, `${label}-kiruna-betalkort.png`);

  await browser.close();
}

async function main() {
  await runViewport("390", { width: 390, height: 844 });
  await runViewport("1440", { width: 1440, height: 900 });
  writeFileSync(
    join(OUT_REPO, "README.txt"),
    "Screenshots for PR postal×fulfillment v2. Do not commit.\n",
  );
  console.log("done →", OUT_REPO);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
