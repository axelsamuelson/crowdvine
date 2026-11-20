/**
 * Guest checkout hotfix evidence on EXACT current git HEAD.
 * Writes only under artifacts/kassa-hotfix/ (+ mirrors to /opt/cursor/artifacts/).
 *
 * node scripts/kassa-hotfix-screenshots.mjs
 */
import { chromium, webkit, devices } from "playwright";
import {
  mkdirSync,
  copyFileSync,
  writeFileSync,
  unlinkSync,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { execSync } from "node:child_process";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT = join(process.cwd(), "artifacts", "kassa-hotfix");
const OPT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });
mkdirSync(OPT, { recursive: true });

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const HEAD_CI = execSync("git log -1 --format=%ci", { encoding: "utf8" }).trim();
const notes = [];
const shotMeta = [];

function freshGuestEmail(prefix) {
  return `kassa.hotfix+${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function shot(page, name) {
  const local = join(OUT, name);
  if (existsSync(local)) unlinkSync(local);
  await page.screenshot({ path: local, fullPage: false });
  try {
    copyFileSync(local, join(OPT, name));
  } catch {
    /* ignore */
  }
  const hash = createHash("md5").update(readFileSync(local)).digest("hex");
  const st = statSync(local);
  const row = {
    file: name,
    md5: hash,
    mtime: st.mtime.toISOString(),
    bytes: st.size,
  };
  shotMeta.push(row);
  console.log("shot", name, hash.slice(0, 8), st.mtime.toISOString());
  return row;
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok()) {
    throw new Error(
      `batch-add ${res.status()} ${JSON.stringify(body).slice(0, 300)}`,
    );
  }
  await page.close();
}

async function selectFulfillment(page, mode) {
  const marker = page.locator(`[data-testid="dual-offer-marker-${mode}"]`);
  if (await marker.count()) {
    await marker.first().click({ force: true });
    await page.waitForTimeout(1200);
    return;
  }
  // Prefer clicking the visible label / row — .check() throws if already checked.
  const radio = page.locator(
    `input[name="fulfillment_channel"][value="${mode}"], input[name="fulfillment_channel"][type="radio"]`,
  );
  const byValue = page.locator(
    `input[name="fulfillment_channel"][value="${mode}"]`,
  );
  if (await byValue.count()) {
    const checked = await byValue.first().isChecked().catch(() => false);
    if (!checked) {
      await byValue.first().click({ force: true });
    }
  } else if (await radio.count()) {
    const idx = mode === "shared_pallet" ? 0 : 1;
    if ((await radio.count()) > idx) {
      const el = radio.nth(idx);
      if (!(await el.isChecked().catch(() => false))) {
        await el.click({ force: true });
      }
    }
  } else {
    // Click text labels when radios are custom-styled
    const label =
      mode === "direct_box"
        ? page.getByText(/Direktleverans|Direct delivery/i).first()
        : page.getByText(/Delad pall|Shared pallet/i).first();
    if (await label.count()) await label.click({ force: true });
  }
  await page.waitForTimeout(1200);
}

async function waitShippingAmount(page, { expectDirect = false } = {}) {
  await page.waitForFunction(
    ({ expectDirect }) => {
      const body = document.body?.innerText || "";
      const pending =
        /Beräknas efter postnummer|Frakt bekräftas innan du debiteras/i.test(
          body,
        );
      const hasAmount = /Frakt[\s\S]{0,100}?\d[\d\s]*kr/i.test(body);
      const totalEllipsis = /Totalt[\s\S]{0,20}?\.\.\./.test(body);
      if (pending || !hasAmount || totalEllipsis) return false;
      if (expectDirect) {
        return /Frakt[\s\S]{0,100}?149\s*kr/i.test(body);
      }
      return true;
    },
    { expectDirect },
    { timeout: 30000 },
  );
}

async function acceptTerms(page) {
  await page.locator("#terms-accept").click({ force: true });
  await page.waitForTimeout(200);
}

async function fillCard4242(page) {
  // Stripe Payment Element — card number in iframe
  const frames = page.frames();
  let filled = false;
  for (const frame of frames) {
    const num = frame.locator(
      'input[name="number"], input[autocomplete="cc-number"], [data-elements-stable-field-name="cardNumber"] input',
    );
    if ((await num.count()) === 0) continue;
    await num.first().fill("4242424242424242");
    const exp = frame.locator(
      'input[name="expiry"], input[autocomplete="cc-exp"], [data-elements-stable-field-name="cardExpiry"] input',
    );
    if (await exp.count()) await exp.first().fill("1234");
    const cvc = frame.locator(
      'input[name="cvc"], input[autocomplete="cc-csc"], [data-elements-stable-field-name="cardCvc"] input',
    );
    if (await cvc.count()) await cvc.first().fill("123");
    filled = true;
    break;
  }
  if (!filled) {
    // Fallback: Stripe often uses title Secure payment input frame
    const cardFrame = page.frameLocator(
      'iframe[title*="Secure"], iframe[name*="privateStripeFrame"]',
    ).first();
    try {
      await cardFrame.locator("input").first().waitFor({ timeout: 5000 });
      const inputs = cardFrame.locator("input");
      const n = await inputs.count();
      if (n >= 1) await inputs.nth(0).fill("4242424242424242");
      if (n >= 2) await inputs.nth(1).fill("12 / 34");
      if (n >= 3) await inputs.nth(2).fill("123");
      filled = true;
    } catch {
      filled = false;
    }
  }
  await page.waitForTimeout(1500);
  return filled;
}

async function run(browserType, prefix, contextOpts) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    locale: "sv-SE",
    colorScheme: "light",
    ...contextOpts,
  });
  await seedCart(context);
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  const piEvents = [];
  page.on("response", async (res) => {
    if (!res.url().includes("/api/checkout/payment-intent")) return;
    let body = "";
    try {
      body = (await res.text()).slice(0, 400);
    } catch {
      /* ignore */
    }
    piEvents.push({ status: res.status(), body });
  });

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", { timeout: 30000 });
  await page.fill("#checkout-postal", "11151");
  await page.waitForTimeout(1500);
  await shot(page, `${prefix}-postnummer.png`);

  // Wait until fulfillment UI / shipping quote exists so shared≠postnummer
  try {
    await page.waitForFunction(
      () => {
        const t = document.body?.innerText || "";
        return (
          /Delad pall|Direktleverans|shared_pallet|direct_box|Frakt/i.test(t) &&
          !/Beräknas efter postnummer/i.test(t)
        );
      },
      { timeout: 25000 },
    );
  } catch {
    notes.push(`${prefix}: fulfillment UI wait timed out after postal`);
  }
  await selectFulfillment(page, "shared_pallet");
  try {
    await waitShippingAmount(page, { expectDirect: false });
  } catch {
    notes.push(`${prefix}: shared shipping wait timed out`);
  }
  await shot(page, `${prefix}-shared_pallet.png`);

  await selectFulfillment(page, "direct_box");
  try {
    await waitShippingAmount(page, { expectDirect: true });
  } catch {
    notes.push(`${prefix}: direct_box 149 wait timed out`);
  }
  await shot(page, `${prefix}-direct_box.png`);

  // Partial email keeps form open
  await page.waitForSelector("#checkout-fullName", { timeout: 20000 });
  await page.fill("#checkout-fullName", "Test Gäst");
  await page.fill("#checkout-email", "test@");
  await page.fill("#checkout-street", "Testgatan 1");
  await page.fill("#checkout-city", "Stockholm");
  await page.waitForTimeout(400);
  const midEmailOpen = (await page.locator("#checkout-email").count()) > 0;
  notes.push(`${prefix}: midEmailOpen=${midEmailOpen}`);

  const guestEmail = freshGuestEmail(prefix);
  notes.push(`${prefix}: guestEmail=${guestEmail}`);
  await page.fill("#checkout-email", guestEmail);
  await page.fill("#checkout-phone", "0701234567");
  try {
    await waitShippingAmount(page, {
      expectDirect: (await page.locator('input[name="fulfillment_channel"]:checked').getAttribute("value").catch(() => null)) === "direct_box",
    });
  } catch {
    /* quote may still settle */
  }
  await page.waitForTimeout(2000);

  const locked = await page
    .getByText("Fyll i leveransadressen först för att fortsätta")
    .isVisible()
    .catch(() => false);
  const dobVisible = await page.locator("#age-dob").isVisible().catch(() => false);
  notes.push(`${prefix}: ageLocked=${locked} dobVisible=${dobVisible}`);
  await shot(page, `${prefix}-saved-address-age.png`);

  // Prove PE for BOTH modes: capture shared_pallet PE then direct_box PE
  for (const mode of ["shared_pallet", "direct_box"]) {
    await selectFulfillment(page, mode);
    await page.waitForTimeout(800);
    if (!(await page.locator("#age-dob").isVisible().catch(() => false))) {
      // collapsed age? click Ändra then re-open — age should stay
      notes.push(`${prefix}: age field missing before ${mode} PE`);
    }
    await page.fill("#age-dob", "19900115");
    await acceptTerms(page);
    await shot(page, `${prefix}-age-terms-${mode}.png`);

    const cont = page.getByRole("button", {
      name: /Fortsätt till betalkort|Continue to payment/i,
    });
    if ((await cont.count()) && (await cont.first().isEnabled())) {
      await cont.first().click();
    }

    // Wait for payment-intent 200 + Stripe PE iframe
    let peOk = false;
    for (let i = 0; i < 40; i++) {
      const hasPi200 = piEvents.some((e) => e.status === 200);
      const iframeCount = await page
        .locator(
          'iframe[name*="privateStripeFrame"], iframe[title*="Secure payment"], iframe[title*="Secure"]',
        )
        .count();
      // Stripe mounts controller iframes early; look for payment input fields
      let hasCardInput = false;
      for (const frame of page.frames()) {
        const n = await frame
          .locator(
            'input[name="number"], input[autocomplete="cc-number"], input[name="cardnumber"]',
          )
          .count()
          .catch(() => 0);
        if (n > 0) {
          hasCardInput = true;
          break;
        }
      }
      if (hasPi200 && (hasCardInput || iframeCount >= 2)) {
        peOk = hasCardInput;
        if (hasCardInput) break;
      }
      await page.waitForTimeout(1000);
    }

    const piOk = piEvents.filter((e) => e.status === 200);
    notes.push(
      `${prefix}:${mode} pi200=${piOk.length} lastPi=${piEvents.at(-1)?.status ?? "none"} peCardInput=${peOk}`,
    );

    if (peOk) {
      const filled = await fillCard4242(page);
      notes.push(`${prefix}:${mode} card4242filled=${filled}`);
      await page.waitForTimeout(2000);
    }

    const kopEnabled = await page
      .locator('[data-testid="checkout-place-reservation"]')
      .isEnabled()
      .catch(() => false);
    notes.push(`${prefix}:${mode} kopEnabled=${kopEnabled}`);
    await shot(page, `${prefix}-payment-element-${mode}.png`);

    // Reset payment card for next mode if continue button gone
    const change = page.getByRole("button", { name: /Ändra|Change/i }).first();
    // Stay on payment; switching fulfillment should refetch intent
  }

  await browser.close();
  return { midEmailOpen, locked, dobVisible, piEvents };
}

async function main() {
  console.log("BASE", BASE, "HEAD", HEAD);
  // Clear prior required shot names so we never keep pre-commit files
  for (const f of [
    "1440-postnummer.png",
    "1440-shared_pallet.png",
    "1440-direct_box.png",
    "1440-saved-address-age.png",
    "390-postnummer.png",
    "390-shared_pallet.png",
    "390-direct_box.png",
    "390-saved-address-age.png",
  ]) {
    const p = join(OUT, f);
    if (existsSync(p)) unlinkSync(p);
  }

  const desk = await run(chromium, "1440", {
    viewport: { width: 1440, height: 900 },
  });
  const phone = await run(webkit, "390", {
    ...devices["iPhone 13"],
  });

  // md5 uniqueness check
  const p1 = join(OUT, "390-postnummer.png");
  const p2 = join(OUT, "390-shared_pallet.png");
  const h1 = createHash("md5").update(readFileSync(p1)).digest("hex");
  const h2 = createHash("md5").update(readFileSync(p2)).digest("hex");
  if (h1 === h2) {
    throw new Error("390-postnummer and 390-shared_pallet are identical (md5)");
  }

  const capturedAt = new Date().toISOString();
  const notesBody = [
    `# kassa-hotfix screenshot notes`,
    ``,
    `- git HEAD: \`${HEAD}\``,
    `- HEAD committer date (UTC): ${HEAD_CI}`,
    `- screenshots captured at (UTC): ${capturedAt}`,
    `- APP_URL: ${BASE}`,
    `- Stripe: local \`.env.local\` uses \`pk_test_\` / \`sk_test_\` (TEST keys) against Supabase TEST \`msdfjrrokcmjifetuwgc\``,
    ``,
    `## Checks`,
    ...notes.map((n) => `- ${n}`),
    ``,
    `## Files`,
    ...shotMeta.map(
      (r) => `- ${r.file} md5=${r.md5} mtime=${r.mtime} bytes=${r.bytes}`,
    ),
    ``,
    `## Summary`,
    `- desk midEmailOpen=${desk.midEmailOpen} locked=${desk.locked}`,
    `- phone midEmailOpen=${phone.midEmailOpen} locked=${phone.locked}`,
    `- 390-postnummer md5 !== 390-shared_pallet md5: ${h1 !== h2}`,
  ].join("\n");

  writeFileSync(join(OUT, "notes.md"), notesBody + "\n");
  try {
    copyFileSync(join(OUT, "notes.md"), join(OPT, "kassa-hotfix-notes.md"));
  } catch {
    /* ignore */
  }
  console.log(notesBody);

  let fail = false;
  if (!desk.midEmailOpen || !phone.midEmailOpen) fail = true;
  if (desk.locked || phone.locked) fail = true;
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
