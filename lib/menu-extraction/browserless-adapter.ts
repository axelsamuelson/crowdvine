/**
 * Browserless.io adapter – /unblock for Cloudflare-protected Starwinelist pages.
 * Used when BROWSERLESS_API_KEY is set (preferred over headless Chromium on serverless IPs).
 */

import { BrowserAdapterError } from "./browser-adapter-error";

const BROWSERLESS_BASE =
  process.env.BROWSERLESS_BASE_URL?.trim() || "https://chrome.browserless.io";
const BROWSERLESS_CONTENT_URL = `${BROWSERLESS_BASE}/content`;
const BROWSERLESS_UNBLOCK_URL = `${BROWSERLESS_BASE}/unblock`;
const BROWSERLESS_FUNCTION_URL = `${BROWSERLESS_BASE}/function`;

function getApiKey(): string | null {
  return process.env.BROWSERLESS_API_KEY?.trim() || null;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 5000,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const is429 = e instanceof BrowserAdapterError && e.status === 429;
      if (!is429 || attempt === maxAttempts) {
        if (is429 && attempt === maxAttempts) {
          throw new BrowserAdapterError(
            `Browserless rate limit (429) after ${maxAttempts} attempts`,
            429,
            e instanceof BrowserAdapterError ? e.url : "",
          );
        }
        throw e;
      }
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        "[browserless-adapter] 429 – retry",
        attempt + "/" + maxAttempts,
        "after",
        delayMs,
        "ms",
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function buildContentRequest(url: string): object {
  return {
    url,
    waitForTimeout: 3000,
    bestAttempt: true,
    gotoOptions: {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    },
    rejectRequestPattern: [
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.gif",
      "*.css",
      "*.woff",
      "*.woff2",
    ],
  };
}

type UnblockCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
};

async function fetchViaUnblock(
  apiUrl: string,
  url: string,
  options: { content: boolean; cookies?: boolean },
): Promise<{ content: string; cookies: UnblockCookie[] }> {
  const body = {
    url,
    content: options.content,
    cookies: options.cookies ?? false,
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
    throw new BrowserAdapterError(
      `Unblock ${res.status}: ${text.slice(0, 150)}`,
      res.status,
      url,
    );
  }
  const json = (await res.json()) as {
    content?: string | null;
    cookies?: UnblockCookie[];
  };
  return {
    content: typeof json.content === "string" ? json.content : "",
    cookies: json.cookies ?? [],
  };
}

async function fetchHtmlViaUnblock(apiUrl: string, url: string): Promise<string> {
  const { content } = await fetchViaUnblock(apiUrl, url, { content: true });
  if (!content.trim()) {
    throw new BrowserAdapterError("Unblock returned empty content", 502, url);
  }
  if (content.includes("Just a moment")) {
    throw new BrowserAdapterError(
      "Cloudflare challenge not resolved (unblock)",
      403,
      url,
    );
  }
  return content;
}

function cookiesToHeader(cookies: UnblockCookie[]): string {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function fetchPdfWithSessionCookies(
  restaurantUrl: string,
  pdfUrl: string,
): Promise<Buffer | null> {
  const key = getApiKey();
  if (!key) return null;
  const unblockUrl = `${BROWSERLESS_UNBLOCK_URL}?token=${encodeURIComponent(key)}`;
  const { cookies } = await fetchViaUnblock(unblockUrl, restaurantUrl, {
    content: false,
    cookies: true,
  });
  if (!cookies.length) return null;

  const res = await fetch(pdfUrl, {
    redirect: "follow",
    headers: {
      Cookie: cookiesToHeader(cookies),
      Accept: "application/pdf,*/*",
      Referer: restaurantUrl,
    },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 0 ? buf : null;
}

export async function fetchRenderedHtml(url: string): Promise<string> {
  const key = getApiKey();
  if (!key) {
    throw new Error("BROWSERLESS_API_KEY is not set");
  }

  const start = Date.now();
  const token = encodeURIComponent(key);

  try {
    const unblockUrl = `${BROWSERLESS_UNBLOCK_URL}?token=${token}`;
    const html = await retryWithBackoff(() =>
      fetchHtmlViaUnblock(unblockUrl, url),
    );
    console.warn(
      "[browserless-adapter] Fetched (unblock)",
      url,
      "in",
      Date.now() - start,
      "ms",
    );
    return html;
  } catch (e) {
    if (e instanceof BrowserAdapterError && e.status >= 400) {
      console.warn(
        "[browserless-adapter] Unblock failed, trying /content:",
        e.message.slice(0, 80),
      );
    } else {
      throw e;
    }
  }

  const apiUrl = `${BROWSERLESS_CONTENT_URL}?token=${token}`;
  const res = await retryWithBackoff(async () => {
    const r = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildContentRequest(url)),
    });
    if (!r.ok) {
      const body = await r.text();
      throw new BrowserAdapterError(
        `Browserless ${r.status}: ${body.slice(0, 200)}`,
        r.status,
        url,
      );
    }
    return r;
  });
  const html = await res.text();
  if (html.includes("Just a moment")) {
    throw new BrowserAdapterError(
      "Cloudflare challenge not resolved (content)",
      403,
      url,
    );
  }
  console.warn(
    "[browserless-adapter] Fetched (content)",
    url,
    "in",
    Date.now() - start,
    "ms",
  );
  return html;
}

const PDF_VIA_FUNCTION_CODE = `export default async ({ page, context }) => {
  const { restaurantUrl, pdfUrl } = context;
  await page.goto(restaurantUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const response = await page.goto(pdfUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  if (!response || !response.ok()) {
    throw new Error('PDF fetch failed with status: ' + (response ? response.status() : 'no response'));
  }
  const buffer = await response.buffer();
  return { data: buffer.toString('base64'), type: 'application/pdf' };
};`;

export async function fetchPdfViaFunction(
  restaurantUrl: string,
  pdfUrl: string,
): Promise<Buffer> {
  const key = getApiKey();
  if (!key) throw new Error("BROWSERLESS_API_KEY is not set");

  const direct = await fetch(pdfUrl, { redirect: "follow" });
  if (direct.ok) {
    const buf = Buffer.from(await direct.arrayBuffer());
    if (buf.length > 0) {
      console.warn("[browserless-adapter] PDF direct fetch OK:", pdfUrl);
      return buf;
    }
  }

  const withCookies = await fetchPdfWithSessionCookies(restaurantUrl, pdfUrl);
  if (withCookies) {
    console.warn(
      "[browserless-adapter] PDF via session cookies:",
      withCookies.length,
      "bytes",
    );
    return withCookies;
  }

  console.warn("[browserless-adapter] PDF via /function:", pdfUrl);
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
        throw new BrowserAdapterError(
          `Browserless /function ${r.status}: ${body.slice(0, 200)}`,
          r.status,
          pdfUrl,
        );
      }
      return r;
    });
    const json = (await res.json()) as { data?: string; type?: string };
    const data = json?.data;
    if (data == null || (typeof data === "string" && data.trim() === "")) {
      throw new BrowserAdapterError("PDF response was empty", 502, pdfUrl);
    }
    return Buffer.from(typeof data === "string" ? data : String(data), "base64");
  } finally {
    clearTimeout(timeoutId);
  }
}
