/**
 * Playwright adapter – Chromium with stealth plugin (playwright-extra).
 * Same interface as browserless-adapter for fetchRenderedHtml and fetchPdfViaFunction.
 * Used when BROWSER_ADAPTER=playwright (no external quota, good for local dev).
 * Fallback if blocked: use BROWSER_ADAPTER=browserless and BROWSERLESS_API_KEY.
 */

import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { BrowserAdapterError } from "./browser-adapter-error";

chromium.use(StealthPlugin());

const GOTO_TIMEOUT_MS = 30000;

/** waitUntil: domcontentloaded – Starwinelist never reaches networkidle (ongoing requests). */
const WAIT_UNTIL = "domcontentloaded" as const;

/** Headed mode behaves like a real browser; Cloudflare may accept it. Set headless: true for CI/server. */
const HEADLESS = false;

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Fetch fully rendered HTML from URL via Playwright with stealth.
 * Cloudflare challenge takes ~3–5s to resolve; we wait 6s then check we got the real page.
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  const start = Date.now();
  let browser = null;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: WAIT_UNTIL, timeout: GOTO_TIMEOUT_MS });
    await page.waitForTimeout(6000);
    const content = await page.content();
    if (content.includes("Just a moment")) {
      throw new BrowserAdapterError(
        "Cloudflare challenge not resolved – got challenge page",
        403,
        url
      );
    }
    const elapsed = Date.now() - start;
    console.warn("[playwright-adapter] Fetching:", url, "(" + elapsed + "ms)");
    return content;
  } catch (e) {
    if (e instanceof BrowserAdapterError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("403") || message.includes("Forbidden") ? 403 : 500;
    throw new BrowserAdapterError(message, status, url);
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Navigate to restaurant page (session/cookies), then trigger PDF download; capture via download-event and return Buffer.
 */
export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string
): Promise<Buffer> {
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ acceptDownloads: true });
  try {
    const page = await context.newPage();
    await page.goto(restaurantUrl, { waitUntil: WAIT_UNTIL, timeout: 30000 });
    await page.waitForTimeout(2000);

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await page.goto(pdfUrl, { timeout: 30000 }).catch(() => {
      // page.goto can throw when navigation is aborted by download – expected
    });

    const download = await downloadPromise;
    const stream = await download.createReadStream();
    if (!stream) {
      throw new BrowserAdapterError("Download createReadStream returned null", 500, pdfUrl);
    }
    const buffer = await streamToBuffer(stream);

    if (!buffer || buffer.length === 0) {
      throw new BrowserAdapterError("PDF download was empty for " + pdfUrl, 500, pdfUrl);
    }

    console.warn("[playwright-adapter] PDF downloaded via download-event:", buffer.length, "bytes");
    return buffer;
  } catch (e) {
    if (e instanceof BrowserAdapterError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    const status = message.includes("403") || message.includes("429") ? (message.includes("429") ? 429 : 403) : 500;
    throw new BrowserAdapterError(message, status, pdfUrl);
  } finally {
    await browser.close();
  }
}
