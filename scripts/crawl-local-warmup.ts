/**
 * One-time setup: open Starwinelist in a visible Chrome window so you can pass
 * Cloudflare manually. Cookies are saved to .starwinelist-browser-profile for
 * subsequent headless `pnpm crawl:local` runs.
 *
 * Run: pnpm crawl:local:warmup
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });

delete process.env.BROWSERLESS_API_KEY;

const PROFILE =
  process.env.LOCAL_PLAYWRIGHT_PROFILE?.trim() ||
  resolve(process.cwd(), ".starwinelist-browser-profile");

async function main(): Promise<void> {
  process.env.LOCAL_PLAYWRIGHT_PROFILE = PROFILE;
  process.env.LOCAL_PLAYWRIGHT_HEADED = "true";

  const { chromium } = await import("playwright-core");
  const channel = process.platform === "darwin" ? "chrome" : undefined;
  console.warn("[crawl-local:warmup] Opening Chrome with profile:", PROFILE);
  console.warn("→ Pass any Cloudflare check in the browser window.");
  console.warn("→ When starwinelist.com loads normally, press Enter here to save and exit.\n");

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false,
    ...(channel ? { channel } : {}),
    locale: "sv-SE",
    timezoneId: "Europe/Stockholm",
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://starwinelist.com/wine-place/agnes", {
    waitUntil: "load",
    timeout: 120000,
  });

  await new Promise<void>((resolvePromise) => {
    process.stdin.once("data", () => resolvePromise());
  });

  await context.close();
  console.warn("[crawl-local:warmup] Profile saved. Run: pnpm crawl:local agnes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
