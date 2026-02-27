/**
 * Polite fetch with timeout, retries (exponential backoff), and optional delay.
 * Used by source adapters to avoid overloading competitor sites.
 */

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const USER_AGENT = "CrowdVinePriceCheck/1.0 (+https://crowdvine.com)";

export interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  delayAfterMs?: number;
}

/** Metadata for a single fetch (diagnostics). */
export interface FetchRecord {
  requestUrl: string;
  status: number;
  contentType: string | null;
  finalUrl: string;
  bodyByteLength: number;
  bodySnippet: string;
  bodyHash?: string;
  botBlockDetected?: boolean;
}

let diagnosticRecorder: ((record: FetchRecord) => void) | null = null;

export function setDiagnosticRecorder(recorder: ((record: FetchRecord) => void) | null): void {
  diagnosticRecorder = recorder;
}

function detectBotBlock(text: string): boolean {
  const lower = text.slice(0, 5000).toLowerCase();
  return (
    /cloudflare|challenge|checking your browser/i.test(lower) ||
    /enable javascript|please enable js/i.test(lower) ||
    /captcha|recaptcha|hcaptcha/i.test(lower) ||
    /access denied|blocked|bot/i.test(lower)
  );
}

function safeSnippet(text: string, maxChars: number = 300): string {
  const s = text.replace(/\s+/g, " ").trim().slice(0, maxChars);
  return s.length === text.length ? s : s + "...";
}

/**
 * Fetch URL with timeout and retries. After a successful response, if delayAfterMs
 * is set, the caller should await delay(delayAfterMs) before next request (rate limit).
 */
export async function fetchWithRetries(
  url: string,
  options: FetchOptions = {}
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html, application/xhtml+xml, application/json, application/ld+json",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      const text = await res.text();
      const contentType = res.headers.get("content-type");
      const botBlock = detectBotBlock(text);

      if (diagnosticRecorder) {
        diagnosticRecorder({
          requestUrl: url,
          status: res.status,
          contentType,
          finalUrl: res.url,
          bodyByteLength: new TextEncoder().encode(text).length,
          bodySnippet: safeSnippet(text),
          botBlockDetected: botBlock,
        });
      }

      return { ok: res.ok, status: res.status, text, url: res.url };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.name === "AbortError" ||
        (lastError as { code?: string }).code === "ECONNRESET" ||
        (lastError as { code?: string }).code === "ETIMEDOUT";
      if (attempt < maxRetries && isRetryable) {
        const backoffMs = Math.min(1000 * 2 ** attempt, 10_000);
        await delay(backoffMs);
      } else {
        throw lastError;
      }
    }
  }

  throw lastError ?? new Error("fetch failed");
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** In-memory TTL cache for PDP content (per URL). Used to avoid re-hitting same URL in one run. */
const cache = new Map<string, { text: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

export async function fetchWithCache(
  url: string,
  options: FetchOptions & { cacheTtlMs?: number } = {}
): Promise<{ ok: boolean; status: number; text: string; url: string }> {
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS;
  const now = Date.now();
  const entry = cache.get(url);
  if (entry && entry.expiresAt > now) {
    return { ok: true, status: 200, text: entry.text, url };
  }

  const result = await fetchWithRetries(url, options);
  if (result.ok && result.text) {
    cache.set(url, { text: result.text, expiresAt: now + cacheTtlMs });
  }
  return result;
}

export function clearFetchCache(): void {
  cache.clear();
}
