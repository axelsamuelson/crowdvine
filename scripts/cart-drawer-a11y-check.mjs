/**
 * Scripted a11y/behaviour checks for the portaled cart drawer (PR249).
 * Requires Next on :3000.
 *
 * Checks:
 *  (a) body scroll locked while open
 *  (b) Esc closes
 *  (c) backdrop click closes
 *  (d) Tab cycles focus inside the drawer
 *  (e) focus returns to cart open button on close
 */
import puppeteer from "puppeteer";

const BASE = process.env.CART_A11Y_BASE || "http://127.0.0.1:3000";
const results = [];

function pass(id, detail = "") {
  results.push({ id, ok: true, detail });
  console.log(`PASS ${id}${detail ? ` — ${detail}` : ""}`);
}
function fail(id, detail) {
  results.push({ id, ok: false, detail });
  console.error(`FAIL ${id} — ${detail}`);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/local/bin/google-chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });

async function openDrawer() {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1200));
  // Ensure a cart badge exists (empty cart still shows after hydrate)
  await page.waitForFunction(
    () =>
      Boolean(document.querySelector("[data-testid=cart-open-button]")) ||
      Boolean(document.querySelector("[data-testid=cart-badge-spacer]")),
    { timeout: 30000 },
  );
  const hasBtn = await page.$("[data-testid=cart-open-button]");
  if (hasBtn) {
    await page.click("[data-testid=cart-open-button]");
  } else {
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent("cart-open-request")),
    );
  }
  await page.waitForSelector("[data-testid=cart-drawer-panel]", {
    timeout: 15000,
  });
  await new Promise((r) => setTimeout(r, 400));
}

try {
  // (a) body scroll lock
  await openDrawer();
  const overflow = await page.evaluate(() => document.body.style.overflow);
  if (overflow === "hidden") pass("a", `body.style.overflow=${overflow}`);
  else fail("a", `expected overflow:hidden, got ${JSON.stringify(overflow)}`);

  // (d) focus trap — Tab should stay inside panel
  await page.evaluate(() => {
    const panel = document.querySelector("[data-testid=cart-drawer-panel]");
    const focusables = panel
      ? [
          ...panel.querySelectorAll(
            'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
          ),
        ]
      : [];
    focusables[0]?.focus();
  });
  const before = await page.evaluate(() => ({
    inPanel: Boolean(
      document
        .querySelector("[data-testid=cart-drawer-panel]")
        ?.contains(document.activeElement),
    ),
    active: document.activeElement?.tagName,
  }));
  // Spam Tab beyond focusable count
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  const afterTab = await page.evaluate(() => ({
    inPanel: Boolean(
      document
        .querySelector("[data-testid=cart-drawer-panel]")
        ?.contains(document.activeElement),
    ),
    activeText: document.activeElement?.textContent?.trim()?.slice(0, 40),
  }));
  if (before.inPanel && afterTab.inPanel) {
    pass("d", `focus stayed in panel (${afterTab.activeText || afterTab})`);
  } else {
    fail("d", `before=${JSON.stringify(before)} after=${JSON.stringify(afterTab)}`);
  }

  // (b) Esc closes
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 500));
  const afterEsc = await page.$("[data-testid=cart-drawer-panel]");
  if (!afterEsc) pass("b", "panel gone after Escape");
  else fail("b", "panel still present after Escape");

  // (e) focus returns to cart button (if badge exists)
  await new Promise((r) => setTimeout(r, 200));
  const focusAfterClose = await page.evaluate(() => ({
    testid: document.activeElement?.getAttribute?.("data-testid"),
    aria: document.activeElement?.getAttribute?.("aria-label"),
    tag: document.activeElement?.tagName,
  }));
  if (
    focusAfterClose.testid === "cart-open-button" ||
    /cart|varukorg|öppna/i.test(focusAfterClose.aria || "")
  ) {
    pass("e", JSON.stringify(focusAfterClose));
  } else {
    // Re-open via button if available to retest restore path cleanly
    const btn = await page.$("[data-testid=cart-open-button]");
    if (!btn) {
      fail("e", `no cart-open-button to restore to; got ${JSON.stringify(focusAfterClose)}`);
    } else {
      await page.focus("[data-testid=cart-open-button]");
      await page.click("[data-testid=cart-open-button]");
      await page.waitForSelector("[data-testid=cart-drawer-panel]", {
        timeout: 10000,
      });
      await page.keyboard.press("Escape");
      await new Promise((r) => setTimeout(r, 500));
      const again = await page.evaluate(() =>
        document.activeElement?.getAttribute?.("data-testid"),
      );
      if (again === "cart-open-button") pass("e", "restored to cart-open-button");
      else fail("e", `active after close: ${again}`);
    }
  }

  // (c) backdrop click closes — at 390 the panel is full-bleed, so use 1440
  // where the drawer is 500px and the dimmed backdrop is clickable on the left.
  await page.setViewport({ width: 1440, height: 900 });
  await openDrawer();
  // Click left side of viewport (backdrop), not the right-side panel.
  await page.mouse.click(80, 400);
  await new Promise((r) => setTimeout(r, 600));
  const afterBackdrop = await page.$("[data-testid=cart-drawer-panel]");
  if (!afterBackdrop) pass("c", "panel gone after backdrop click @1440");
  else fail("c", "panel still present after backdrop click @1440");
} catch (err) {
  fail("setup", err instanceof Error ? err.message : String(err));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log("\nSUMMARY", JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
