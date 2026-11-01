/**
 * Capture exit-feedback popup at 390 and 1440 (open + free-text).
 * Requires local Next at BASE (default http://127.0.0.1:3000).
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
  process.env.CHROME_PATH ||
  "/usr/bin/google-chrome-stable";

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
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  console.log("goto", url, res?.status());
  await page.waitForSelector('[data-exit-prompt-panel]', { timeout: 30000 });
  // Hide Next.js/Turbopack/React issue badges for clean design-review shots.
  await page.addStyleTag({
    content:
      "nextjs-portal,[data-next-badge-root],[data-nextjs-toast],#__next-build-watcher{display:none!important;visibility:hidden!important}",
  });
}

try {
  for (const vp of WIDTHS) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await preparePage(page);

    const openPath = path.join(OUT, `exit-feedback-${vp.label}-open.png`);
    await page.screenshot({ path: openPath, fullPage: false });
    console.log("wrote", openPath);

    // Select "Annat" to reveal free-text + privacy helper
    await page.locator('input[name="exit-feedback-reason"][value="other"]').check();
    await page.waitForSelector("[data-exit-prompt-freetext]", { timeout: 10000 });
    await page.waitForSelector("[data-exit-prompt-privacy-helper]", {
      timeout: 10000,
    });
    await page.locator("[data-exit-prompt-freetext]").fill("Test utan personuppgifter");
    // Scroll helper into view on small screens
    await page.locator("[data-exit-prompt-privacy-helper]").scrollIntoViewIfNeeded();

    const freePath = path.join(OUT, `exit-feedback-${vp.label}-freetext.png`);
    await page.screenshot({ path: freePath, fullPage: false });
    console.log("wrote", freePath);
    await page.close();
  }

  fs.writeFileSync(
    path.join(OUT, "README.md"),
    `# Exit feedback design review

Question-only exit-intent popup (no discount / email / offer).

- \`exit-feedback-mobile-390-open.png\` / \`exit-feedback-desktop-1440-open.png\` — popup open
- \`exit-feedback-mobile-390-freetext.png\` / \`exit-feedback-desktop-1440-freetext.png\` — free-text + privacy helper

Safe to delete after design sign-off.
`,
  );
  console.log("wrote README");
} finally {
  await browser.close();
}
