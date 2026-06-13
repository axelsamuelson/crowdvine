/**
 * Playwright adapter – Chromium via playwright-core.
 * Fallback when BROWSERLESS_API_KEY is unset. Often blocked by Cloudflare on datacenter IPs.
 */

import { chromium as playwrightChromium, type Browser, type BrowserContext } from "playwright-core";
import { BrowserAdapterError } from "./browser-adapter-error";

const GOTO_TIMEOUT_MS = 30000;
const CLOUDFLARE_MAX_WAIT_MS = 45000;
const CLOUDFLARE_POLL_MS = 2000;
const WAIT_UNTIL = "domcontentloaded" as const;

const CHROME_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

function isCloudflareChallenge(html: string): boolean {
  return (
    html.includes("Just a moment") ||
    html.includes("cf-browser-verification") ||
    html.includes("challenge-platform")
  );
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

async function newStealthContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    userAgent: CHROME_USER_AGENT,
    viewport: { width: 1366, height: 768 },
    locale: "sv-SE",
    timezoneId: "Europe/Stockholm",
  });
}

async function waitForRealPage(page: import("playwright-core").Page): Promise<string> {
  const deadline = Date.now() + CLOUDFLARE_MAX_WAIT_MS;
  let content = await page.content();
  while (isCloudflareChallenge(content) && Date.now() < deadline) {
    await delay(CLOUDFLARE_POLL_MS);
    content = await page.content();
  }
  if (isCloudflareChallenge(content)) {
    throw new BrowserAdapterError(
      "Cloudflare challenge not resolved – got challenge page",
      403,
      page.url(),
    );
  }
  return content;
}

export async function fetchRenderedHtml(url: string): Promise<string> {
  const start = Date.now();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context = await newStealthContext(browser);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: WAIT_UNTIL, timeout: GOTO_TIMEOUT_MS });
    const content = await waitForRealPage(page);
    console.warn("[playwright-adapter] Fetching:", url, "(" + (Date.now() - start) + "ms)");
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

export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string,
): Promise<Buffer> {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const context = await newStealthContext(browser);
    await context.setExtraHTTPHeaders({ Accept: "application/pdf,*/*" });
    const page = await context.newPage();
    await page.goto(restaurantUrl, { waitUntil: WAIT_UNTIL, timeout: GOTO_TIMEOUT_MS });
    await waitForRealPage(page);
    await delay(2000);

    const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
    await page.goto(pdfUrl, { timeout: 30000 }).catch(() => {});

    const download = await downloadPromise;
    const stream = await download.createReadStream();
    if (!stream) {
      throw new BrowserAdapterError("Download createReadStream returned null", 500, pdfUrl);
    }
    const buffer = await streamToBuffer(stream);
    if (!buffer.length) {
      throw new BrowserAdapterError("PDF download was empty for " + pdfUrl, 500, pdfUrl);
    }
    console.warn("[playwright-adapter] PDF downloaded:", buffer.length, "bytes");
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
