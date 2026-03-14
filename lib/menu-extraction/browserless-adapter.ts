/**
 * Browserless.io adapter – headless Chrome for fetching rendered HTML and binary files.
 * Isolated so the rest of the app does not depend on Browserless directly.
 * TODO(menu-extraction): If rate limits change, tune retryWithBackoff maxAttempts/baseDelayMs.
 */

const BROWSERLESS_BASE = "https://chrome.browserless.io";
const BROWSERLESS_CONTENT_URL = `${BROWSERLESS_BASE}/content`;
const BROWSERLESS_UNBLOCK_URL = `${BROWSERLESS_BASE}/unblock`;
const BROWSERLESS_FUNCTION_URL = `${BROWSERLESS_BASE}/function`;

export class BrowserlessError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string
  ) {
    super(message);
    this.name = "BrowserlessError";
  }
}

function getApiKey(): string | null {
  return process.env.BROWSERLESS_API_KEY?.trim() || null;
}

/**
 * When true, use plain fetch() instead of Browserless.
 * Only works from IPs that Starwinelist does not block (e.g. home/office). Set USE_LOCAL_FETCH=true in .env.local.
 */
function useLocalFetch(): boolean {
  return process.env.USE_LOCAL_FETCH === "true";
}

/**
 * Retry only on 429. Delays: baseDelayMs, then baseDelayMs*2, then baseDelayMs*4 (5s → 10s → 20s).
 * Other errors are thrown immediately. After maxAttempts exhausted, throws BrowserlessError with status 429.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 5000
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const is429 = e instanceof BrowserlessError && e.status === 429;
      if (!is429 || attempt === maxAttempts) {
        if (is429 && attempt === maxAttempts) {
          throw new BrowserlessError(
            "Browserless rate limit (429) after " + maxAttempts + " attempts",
            429,
            e instanceof BrowserlessError ? e.url : ""
          );
        }
        throw e;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        "[browserless-adapter] 429 rate limit – retry",
        attempt + "/" + maxAttempts,
        "efter",
        delayMs,
        "ms"
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/**
 * Build request body for Browserless /content API.
 * @see https://docs.browserless.io/http-apis/content
 */
export function buildBrowserlessRequest(url: string): object {
  return {
    url,
    waitForTimeout: 3000,
    bestAttempt: true,
    gotoOptions: {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    },
    rejectRequestPattern: ["*.png", "*.jpg", "*.jpeg", "*.gif", "*.css", "*.woff", "*.woff2"],
  };
}

/**
 * Fetch HTML via Browserless /unblock API (better for bot‑protected sites).
 * Returns JSON with { content: string | null }. Uses content API as fallback if unblock fails.
 */
async function fetchHtmlViaUnblock(apiUrl: string, url: string): Promise<string> {
  const body = {
    url,
    content: true,
    cookies: false,
    screenshot: false,
    browserWSEndpoint: false,
    gotoOptions: { waitUntil: "domcontentloaded" as const, timeout: 45000 },
    bestAttempt: true,
  };
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new BrowserlessError(`Unblock ${res.status}: ${text.slice(0, 150)}`, res.status, url);
  }
  let json: { content?: string | null };
  try {
    json = (await res.json()) as { content?: string | null };
  } catch {
    return "";
  }
  const html = json?.content ?? "";
  return typeof html === "string" ? html : "";
}

/**
 * Fetch fully rendered HTML from a URL via Browserless headless Chrome.
 * Prefers /unblock for bot‑protected sites; falls back to /content.
 * Throws BrowserlessError on 4xx/5xx. Throws if BROWSERLESS_API_KEY is not set (unless USE_LOCAL_FETCH=true).
 */
export async function fetchRenderedHtml(url: string): Promise<string> {
  const key = getApiKey();
  if (!useLocalFetch() && !key) {
    throw new Error("BROWSERLESS_API_KEY is not set");
  }

  if (useLocalFetch()) {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    const elapsed = Date.now() - start;
    console.warn("[browserless-adapter] USE_LOCAL_FETCH: fetched", url, "in", elapsed, "ms, status", res.status);
    if (!res.ok) {
      throw new BrowserlessError(`HTTP ${res.status}`, res.status, url);
    }
    return res.text();
  }

  const start = Date.now();
  const token = encodeURIComponent(key!);

  // Prefer Unblock API for sites that may block headless browsers
  try {
    const unblockUrl = `${BROWSERLESS_UNBLOCK_URL}?token=${token}`;
    const html = await retryWithBackoff(() => fetchHtmlViaUnblock(unblockUrl, url));
    const elapsed = Date.now() - start;
    console.warn("[browserless-adapter] Fetched (unblock)", url, "in", elapsed, "ms");
    return html;
  } catch (e) {
    if (e instanceof BrowserlessError && e.status >= 400) {
      console.warn("[browserless-adapter] Unblock failed, trying /content:", e.message.slice(0, 80));
    }
  }

  const apiUrl = `${BROWSERLESS_CONTENT_URL}?token=${token}`;
  const res = await retryWithBackoff(async () => {
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBrowserlessRequest(url)),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new BrowserlessError(
        `Browserless ${r.status}: ${body.slice(0, 200)}`,
        r.status,
        url
      );
    }
    return r;
  });
  const elapsed = Date.now() - start;
  console.warn("[browserless-adapter] Fetched", url, "in", elapsed, "ms, status", res.status);
  return res.text();
}

// TODO(menu-extraction): Browserless /function: free tier = 1 min max session; plan timeouts apply. Our request timeout is 60s.
const PDF_VIA_FUNCTION_CODE = `export default async ({ page, context }) => {
  const { restaurantUrl, pdfUrl } = context;
  await page.goto(restaurantUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  const response = await page.goto(pdfUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error('PDF fetch failed with status: ' + (response ? response.status() : 'no response'));
  }
  const buffer = await response.buffer();
  const base64 = buffer.toString('base64');
  return { data: base64, type: 'application/pdf' };
};`;

/**
 * Fetch PDF via Browserless /function: navigate to restaurant page first (session/cookies), then fetch PDF in same context.
 * Returns the PDF as Buffer. Throws on API or runtime errors.
 */
export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string
): Promise<Buffer> {
  const key = getApiKey();
  if (!key) throw new Error("BROWSERLESS_API_KEY is not set");

  console.warn("[browserless-adapter] Fetching PDF via Browserless /function:", pdfUrl);
  const apiUrl = `${BROWSERLESS_FUNCTION_URL}?token=${encodeURIComponent(key)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  try {
    const res = await retryWithBackoff(async () => {
      const r = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: PDF_VIA_FUNCTION_CODE,
          context: { restaurantUrl, pdfUrl },
        }),
        signal: controller.signal,
      });
      if (!r.ok) {
        const body = await r.text();
        throw new BrowserlessError(
          `Browserless /function ${r.status}: ${body.slice(0, 200)}`,
          r.status,
          pdfUrl
        );
      }
      return r;
    });
    clearTimeout(timeoutId);
    const json = (await res.json()) as { data?: string; type?: string };
    const type = json?.type ?? "";
    if (type !== "application/pdf" && type !== "binary") {
      console.warn("[browserless-adapter] /function returned type:", type);
    }
    const data = json?.data;
    if (data == null || (typeof data === "string" && data.trim() === "")) {
      throw new Error("PDF response was empty");
    }
    const base64 = typeof data === "string" ? data : String(data);
    return Buffer.from(base64, "base64");
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof BrowserlessError) throw e;
    if (e instanceof Error) throw e;
    throw new Error(String(e));
  }
}

/**
 * Direct fetch of URL (no Browserless). Returns Buffer or null on non-2xx.
 * Use for PDF URLs that are reachable from current IP (e.g. local/dev).
 */
export async function fetchPdfDirect(pdfUrl: string): Promise<Buffer | null> {
  try {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

export interface DiagnosePdfResult {
  directFetchStatus: number | null;
  directFetchWorks: boolean;
  contentType: string | null;
  requiresSession: boolean | null;
  notes: string;
}

/**
 * Test whether pdfUrl is directly accessible without session.
 * TODO(menu-extraction): For debugging only – not used in production crawl flow.
 */
export async function diagnosePdfUrl(pdfUrl: string): Promise<DiagnosePdfResult> {
  let directFetchStatus: number | null = null;
  let contentType: string | null = null;
  try {
    const res = await fetch(pdfUrl, { redirect: "follow" });
    directFetchStatus = res.status;
    contentType = res.headers.get("content-type");
    const ok = res.ok;
    const requiresSession =
      directFetchStatus === 403 || directFetchStatus === 401
        ? true
        : ok
          ? false
          : null;
    return {
      directFetchStatus,
      directFetchWorks: ok,
      contentType,
      requiresSession,
      notes: ok
        ? "Direct fetch succeeded; session may not be required."
        : directFetchStatus === 403 || directFetchStatus === 401
          ? "Direct fetch blocked (403/401); likely requires session or Browserless /function."
          : `Direct fetch returned ${directFetchStatus}.`,
    };
  } catch (e) {
    return {
      directFetchStatus: null,
      directFetchWorks: false,
      contentType: null,
      requiresSession: null,
      notes: `Direct fetch failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Fetch a binary file (e.g. PDF) via Browserless. Returns Buffer.
 * Tries direct fetch first (many PDF endpoints allow it); uses Browserless only if we get 403.
 */
export async function fetchBinaryFile(url: string): Promise<Buffer> {
  const key = getApiKey();
  if (!useLocalFetch() && !key) {
    throw new Error("BROWSERLESS_API_KEY is not set");
  }

  if (useLocalFetch()) {
    const start = Date.now();
    const res = await fetch(url, { redirect: "follow" });
    const elapsed = Date.now() - start;
    console.warn("[browserless-adapter] USE_LOCAL_FETCH: fetched binary", url, "in", elapsed, "ms, status", res.status);
    if (!res.ok) {
      throw new BrowserlessError(`HTTP ${res.status}`, res.status, url);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  // Try direct fetch first – many PDF download URLs don't block server IPs
  const direct = await fetch(url, { redirect: "follow" });
  if (direct.ok) {
    const ab = await direct.arrayBuffer();
    console.warn("[browserless-adapter] Fetched binary (direct)", url, "status", direct.status);
    return Buffer.from(ab);
  }
  if (direct.status !== 403 && direct.status !== 401) {
    throw new BrowserlessError(`HTTP ${direct.status}`, direct.status, url);
  }

  const start = Date.now();
  const apiUrl = `${BROWSERLESS_CONTENT_URL}?token=${encodeURIComponent(key!)}`;
  const body = {
    ...buildBrowserlessRequest(url),
    gotoOptions: { waitUntil: "domcontentloaded" as const, timeout: 25000 },
    bestAttempt: true,
  };
  const res = await retryWithBackoff(async () => {
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      throw new BrowserlessError(
        `Browserless ${r.status}: ${text.slice(0, 200)}`,
        r.status,
        url
      );
    }
    return r;
  });
  const elapsed = Date.now() - start;
  console.warn("[browserless-adapter] Fetched binary (browserless)", url, "in", elapsed, "ms, status", res.status);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
