/**
 * Capture exit-feedback popup at 390 and 1440 (open + free-text).
 * Requires local Next at BASE (default http://127.0.0.1:3000).
 *
 * Always uses deviceScaleFactor: 1 and a real CSS viewport width
 * (390 or 1440) — never a downscaled retina capture.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.EXIT_FEEDBACK_SHOT_BASE || "http://127.0.0.1:3000";
const OUT = path.resolve("docs/design-review/exit-feedback");
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { width: 390, height: 844, label: "mobile-390" },
  { width: 1440, height: 900, label: "desktop-1440" },
];

const chromePath =
  process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

async function preparePage(page) {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });
  const url = `${BASE}/?exit_test=1&exit_open=1`;
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  console.log("goto", url, res?.status());
  await page.waitForSelector("[data-exit-prompt-panel]", { timeout: 30000 });
  await page.addStyleTag({
    content:
      "nextjs-portal,[data-next-badge-root],[data-nextjs-toast],#__next-build-watcher{display:none!important;visibility:hidden!important}",
  });
}

async function readComputed(page) {
  return page.evaluate(() => {
    const title = document.querySelector("[data-exit-prompt-title]");
    const opt = document.querySelector("[data-exit-prompt-option] span");
    const hint = document.querySelector("[data-exit-prompt-privacy-helper]");
    const btn = document.querySelector("[data-exit-prompt-submit]");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      innerWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
      titleFontSize: title ? cs(title).fontSize : null,
      titleFontWeight: title ? cs(title).fontWeight : null,
      titleTextWrap: title ? cs(title).textWrap : null,
      titleText: title?.textContent ?? null,
      optionFontSize: opt ? cs(opt).fontSize : null,
      hintFontSize: hint ? cs(hint).fontSize : null,
      hintColor: hint ? cs(hint).color : null,
      buttonBg: btn ? cs(btn).backgroundColor : null,
      buttonColor: btn ? cs(btn).color : null,
      buttonOpacity: btn ? cs(btn).opacity : null,
      buttonDisabled: btn ? btn.disabled : null,
    };
  });
}

const report = {};

try {
  for (const vp of WIDTHS) {
    // Real CSS pixels at deviceScaleFactor 1 (no retina downscale).
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await preparePage(page);

    const viewportMeta = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    }));
    console.log("viewport", vp.label, viewportMeta);

    const openPath = path.join(OUT, `exit-feedback-${vp.label}-open.png`);
    await page.screenshot({ path: openPath, fullPage: false });
    console.log("wrote", openPath);

    // Click the label so React onChange sets reason (enables Skicka).
    await page.locator('label:has(input[value="other"])').click();
    await page.waitForSelector("[data-exit-prompt-freetext]", { timeout: 10000 });
    await page.waitForSelector(
      '[data-exit-prompt-submit]:not([disabled])',
      { timeout: 10000 },
    );
    await page.waitForFunction(() => {
      const btn = document.querySelector("[data-exit-prompt-submit]");
      if (!btn) return false;
      const s = getComputedStyle(btn);
      return (
        !btn.disabled &&
        s.opacity === "1" &&
        (s.backgroundColor === "rgb(10, 10, 10)" ||
          s.backgroundColor === "#0a0a0a")
      );
    });
    await page.locator("[data-exit-prompt-freetext]").fill(
      "Test utan personuppgifter",
    );
    await page
      .locator("[data-exit-prompt-privacy-helper]")
      .scrollIntoViewIfNeeded();

    const computed = await readComputed(page);
    report[vp.label] = computed;
    console.log("computed", vp.label, JSON.stringify(computed, null, 2));

    const freePath = path.join(OUT, `exit-feedback-${vp.label}-freetext.png`);
    await page.screenshot({ path: freePath, fullPage: false });
    console.log("wrote", freePath);
    await context.close();
  }

  fs.writeFileSync(
    path.join(OUT, "computed-sizes.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(OUT, "README.md"),
    `# Exit feedback design review

Question-only exit-intent popup (no discount / email / offer).

- \`exit-feedback-mobile-390-open.png\` / \`exit-feedback-desktop-1440-open.png\` — popup open
- \`exit-feedback-mobile-390-freetext.png\` / \`exit-feedback-desktop-1440-freetext.png\` — free-text + privacy helper
- Captured at CSS viewport 390×844 / 1440×900 with \`deviceScaleFactor: 1\`

Safe to delete after design sign-off.
`,
  );
  console.log("wrote README + computed-sizes.json");
} finally {
  await browser.close();
}
