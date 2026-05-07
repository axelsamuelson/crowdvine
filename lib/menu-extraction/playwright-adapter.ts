/**
 * Playwright adapter – Chromium via playwright-core.
 * On Vercel: @sparticuz/chromium (no API key, bundled binary for serverless).
 * Locally: playwright-core default launch (run `pnpm exec playwright install chromium` if needed).
 */

import { chromium as playwrightChromium, type Browser } from "playwright-core";
import { BrowserAdapterError } from "./browser-adapter-error";

const GOTO_TIMEOUT_MS = 30000;

/** waitUntil: domcontentloaded – Starwinelist never reaches networkidle (ongoing requests). */
const WAIT_UNTIL = "domcontentloaded" as const;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL === "1") {
    const chromium = (await import("@sparticuz/chromium")).default;
    return playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  return playwrightChromium.launch({ headless: true });
}

/**
 * Fetch fully rendered HTML from URL via Chromium.
 * Cloudflare challenge takes ~3–5s to resolve; we wait 6s then check we got the real page.
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  const start = Date.now();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: WAIT_UNTIL, timeout: GOTO_TIMEOUT_MS });
    await delay(6000);
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
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    await page.goto(restaurantUrl, { waitUntil: WAIT_UNTIL, timeout: 30000 });
    await delay(2000);

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
    if (browser) await browser.close();
  }
}
