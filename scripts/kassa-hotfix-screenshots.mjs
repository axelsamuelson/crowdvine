/**
 * Local TEST checkout smoke + screenshots for kassa hotfix.
 * Guest: 6 bottles one source, postal 11151, both fulfillment modes,
 * saved address → age unlocked. WebKit iPhone + Chromium desktop.
 *
 * node scripts/kassa-hotfix-screenshots.mjs
 */
import { chromium, webkit, devices } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.APP_URL || "http://localhost:3000";
const WINE_ID =
  process.env.KASSA_TEST_WINE_ID || "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const OUT = join(process.cwd(), "artifacts", "kassa-hotfix");
const OPT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });
mkdirSync(OPT, { recursive: true });

/** Fresh guest email each run — reused addresses hit ensure-session 409 (OTP). */
function freshGuestEmail(prefix) {
  return `kassa.hotfix+${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function shot(page, name) {
  const local = join(OUT, name);
  await page.screenshot({ path: local, fullPage: false });
  try {
    copyFileSync(local, join(OPT, name));
  } catch {
    /* ignore */
  }
  console.log("shot", name);
}

async function seedCart(context) {
  const page = await context.newPage();
  const res = await page.request.post(`${BASE}/api/cart/batch-add`, {
    data: { items: [{ variantId: WINE_ID, quantity: 6 }] },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok()) {
    throw new Error(`batch-add ${res.status()} ${JSON.stringify(body).slice(0, 300)}`);
  }
  await page.close();
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
  page.setDefaultTimeout(30000);

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#checkout-postal", { timeout: 30000 });
  await page.waitForTimeout(1000);

  const postal = page.locator("#checkout-postal");
  await postal.waitFor();
  await postal.fill("11151");
  await page.waitForTimeout(1200);
  await shot(page, `${prefix}-postnummer.png`);

  // Wait for delivery options (after zone match), then both fulfillment radios
  await page.waitForTimeout(1500);
  for (const mode of ["shared_pallet", "direct_box"]) {
    const radio = page.locator(
      `input[name="fulfillment_channel"][type="radio"]`,
    );
    const marker = page.locator(`[data-testid="dual-offer-marker-${mode}"]`);
    if (await marker.count()) {
      await marker.first().click({ force: true });
    } else if (await radio.count()) {
      const idx = mode === "shared_pallet" ? 0 : 1;
      if ((await radio.count()) > idx) {
        await radio.nth(idx).check({ force: true });
      }
    }
    await page.waitForTimeout(800);
    await shot(page, `${prefix}-${mode}.png`);
  }

  // Partial email without phone must keep form open
  await page.locator("#checkout-fullName").waitFor({ timeout: 20000 });
  await page.locator("#checkout-fullName").fill("Test Gäst");
  await page.locator("#checkout-email").fill("test@");
  await page.locator("#checkout-street").fill("Testgatan 1");
  await page.locator("#checkout-city").fill("Stockholm");
  await page.waitForTimeout(500);
  const midEmailOpen = (await page.locator("#checkout-email").count()) > 0;
  console.log(prefix, "form open mid-email (expect true):", midEmailOpen);

  const guestEmail = freshGuestEmail(prefix);
  console.log(prefix, "guestEmail", guestEmail);
  await page.locator("#checkout-email").fill(guestEmail);
  await page.locator("#checkout-phone").fill("0701234567");
  // Wait for auto-save + age reveal + ensure-session + quote refetch
  await page.waitForTimeout(2500);
  try {
    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || "";
        // Real charged shipping (not pending copy / ellipsis total).
        const hasAmount = /Frakt[\s\S]{0,80}?\d[\d\s]*kr/i.test(body);
        const pending =
          /Beräknas efter postnummer|Frakt bekräftas innan du debiteras/i.test(
            body,
          );
        return hasAmount && !pending;
      },
      { timeout: 25000 },
    );
  } catch {
    console.warn(prefix, "shipping quote still pending after wait");
  }

  const locked = await page
    .getByText("Fyll i leveransadressen först för att fortsätta")
    .isVisible()
    .catch(() => false);
  const ageHeading = await page
    .getByRole("heading", { name: /Ålder|Age/i })
    .isVisible()
    .catch(() => false);
  const dob = page.locator("#age-dob");
  const dobVisible = await dob.isVisible().catch(() => false);
  console.log(prefix, { locked, ageHeading, dobVisible });
  await shot(page, `${prefix}-saved-address-age.png`);

  if (dobVisible) {
    await dob.fill("19900115");
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const labels = [...document.querySelectorAll("label")];
      const lab = labels.find((l) =>
        /köpvillkor|integritetspolicy|terms/i.test(l.textContent || ""),
      );
      if (lab) lab.click();
      else {
        for (const el of document.querySelectorAll(
          'button[role="checkbox"], input[type="checkbox"]',
        )) {
          el.click();
        }
      }
    });
    await page.waitForTimeout(300);
    const cont = page.getByRole("button", {
      name: /Fortsätt till betalkort|Continue to payment|Fortsätt/i,
    });
    if ((await cont.count()) && (await cont.first().isEnabled())) {
      await cont.first().click();
      // Guest ensure-session + zone-address persist + SetupIntent need time.
      await page.waitForTimeout(6000);
      const pe =
        (await page.locator(
          'iframe[name*="privateStripeFrame"], iframe[title*="Secure"]',
        ).count()) > 0 ||
        (await page.getByText(/Kortnummer|Card number|Betalningen är inte redo/i).count()) >
          0;
      console.log(prefix, "paymentElementOrStatusVisible:", pe);
    }
  }
  await shot(page, `${prefix}-payment.png`);

  const text = await page.locator("body").innerText();
  const shippingStuck = /Beräknas efter postnummer/i.test(text);
  const peNotReady = /Betalningen är inte redo|Add delivery details/i.test(text);
  console.log(prefix, "shippingAfterAddress still:", shippingStuck, "peNotReady:", peNotReady);

  await browser.close();
  return { midEmailOpen, locked, dobVisible, shippingStuck };
}

async function main() {
  console.log("BASE", BASE);
  const desk = await run(chromium, "1440", {
    viewport: { width: 1440, height: 900 },
  });
  const phone = await run(webkit, "390", {
    ...devices["iPhone 13"],
  });
  console.log("SUMMARY", { desk, phone });
  let fail = false;
  if (!desk.midEmailOpen || !phone.midEmailOpen) {
    console.error("premature address collapse");
    fail = true;
  }
  if (desk.locked || phone.locked) {
    console.error("age step still locked");
    fail = true;
  }
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
