/**
 * Mobile-emulation Playwright coverage for checkout DOB text input.
 *
 * Runs Chromium with Pixel 5 (Android) via @sparticuz/chromium, and WebKit with
 * iPhone 13 when Playwright WebKit + host deps are available.
 *
 * These are browser emulations (UA / viewport / touch flags) — not real phones.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  chromium,
  webkit,
  devices,
  type Browser,
  type BrowserContext,
  type Page,
} from "playwright-core";

import {
  applyBackspaceOverHyphen,
  formatDobInputChange,
  maskIsoDateDigits,
} from "@/lib/checkout/date-of-birth-input";

const FIXTURE = pathToFileURL(
  path.resolve(__dirname, "fixtures/checkout-dob-mobile.html"),
).href;

const PIXEL5 = devices["Pixel 5"];
const IPHONE13 = devices["iPhone 13"];

type EngineName = "chromium-android-pixel5" | "webkit-iphone13";

async function launchChromiumAndroid(): Promise<Browser> {
  const sparticuz = (await import("@sparticuz/chromium")).default;
  const executablePath = await sparticuz.executablePath();
  return chromium.launch({
    executablePath,
    headless: true,
    args: [
      ...sparticuz.args,
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
}

async function launchWebKitIPhone(): Promise<Browser | null> {
  try {
    return await webkit.launch({ headless: true });
  } catch (err) {
    console.warn(
      "[checkout-dob-mobile.e2e] WebKit launch failed (missing browser or host deps); skipping WebKit-iPhone cases:",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

async function openDobPage(
  browser: Browser,
  device: (typeof devices)[string],
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    ...device,
    // Emulation only — not a physical device.
    locale: "sv-SE",
  });
  const page = await context.newPage();
  await page.goto(FIXTURE, { waitUntil: "domcontentloaded" });

  // Fixture inlines the same algorithms; assert lockstep with the TS module.
  const fixtureMask = await page.evaluate(() =>
    (window as unknown as { __dobHelpers: { maskIsoDateDigits: (s: string) => string } })
      .__dobHelpers.maskIsoDateDigits("19900115"),
  );
  expect(fixtureMask).toBe(maskIsoDateDigits("19900115"));
  expect(formatDobInputChange("19900115", 8).value).toBe("1990-01-15");
  expect(applyBackspaceOverHyphen("1990-01-", 8, 8)?.value).toBe("1990-0");

  return { context, page };
}

async function readDob(page: Page): Promise<string> {
  return page.locator("#age-dob").inputValue();
}

async function typeDigits(page: Page, digits: string) {
  const input = page.locator("#age-dob");
  await input.click();
  for (const ch of digits) {
    await input.press(ch);
  }
}

/** Drive Backspace-over-hyphen via the fixture keydown handler (sync preventDefault). */
async function backspaceOverHyphenAt(
  page: Page,
  value: string,
  caret: number,
) {
  await page.locator("#age-dob").evaluate(
    (el, args) => {
      const input = el as HTMLInputElement;
      input.value = args.value;
      input.setSelectionRange(args.caret, args.caret);
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Backspace",
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { value, caret },
  );
}

function pasteCases(): Array<{ label: string; paste: string; expected: string }> {
  return [
    { label: "ISO dashed", paste: "1990-01-15", expected: "1990-01-15" },
    { label: "digits only YYYYMMDD", paste: "19900115", expected: "1990-01-15" },
    {
      label: "Swedish personnummer-like 12 digits (first 8 used)",
      paste: "19900115-1234",
      expected: "1990-01-15",
    },
    {
      label: "spaced / dotted date",
      paste: "1990.01.15",
      expected: "1990-01-15",
    },
    {
      label: "slash date digits",
      paste: "1990/01/15",
      expected: "1990-01-15",
    },
  ];
}

function registerEngineSuite(
  engine: EngineName,
  device: (typeof devices)[string],
  launch: () => Promise<Browser | null>,
) {
  describe(`checkout DOB mobile emulation (${engine})`, () => {
    it(
      "auto-hyphens while typing, Backspace over hyphen, and paste formats",
      async () => {
        const browser = await launch();
        if (!browser) {
          // WebKit may be unavailable in CI without host deps — Chromium suite still runs.
          expect(engine).toBe("webkit-iphone13");
          return;
        }

        const { context, page } = await openDobPage(browser, device);
        try {
          // Auto-hyphens as digits are typed (device keyboard emulation)
          await typeDigits(page, "199001");
          expect(await readDob(page)).toBe("1990-01");
          await typeDigits(page, "15");
          expect(await readDob(page)).toBe("1990-01-15");

          // Backspace over hyphen deletes the previous digit
          await backspaceOverHyphenAt(page, "1990-01-", 8);
          expect(await readDob(page)).toBe("1990-0");
          await backspaceOverHyphenAt(page, "1990-", 5);
          expect(await readDob(page)).toBe("199");

          // Paste whole personnummer / date in several formats
          for (const c of pasteCases()) {
            await page.locator("#age-dob").evaluate((el, value) => {
              const input = el as HTMLInputElement;
              input.value = value;
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }, c.paste);
            expect(await readDob(page), c.label).toBe(c.expected);
          }
        } finally {
          await context.close();
          await browser.close();
        }
      },
      60_000,
    );
  });
}

registerEngineSuite("chromium-android-pixel5", PIXEL5, launchChromiumAndroid);
registerEngineSuite("webkit-iphone13", IPHONE13, launchWebKitIPhone);
