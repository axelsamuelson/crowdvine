/** Browserless session timeout caps (ms) — billed in ~30s unit increments. */

export const DEFAULT_BROWSERLESS_TIMEOUT_HTML_MS = 30_000;
export const DEFAULT_BROWSERLESS_TIMEOUT_FULL_MS = 90_000;

/** Estimated units per call at default caps (30s = 1, 90s = 3). */
export const BROWSERLESS_UNITS_PER_HTML_CALL = 1;
export const BROWSERLESS_UNITS_PER_FULL_CALL = 3;

export type BrowserlessTimeoutMode = "html" | "full";

export function getBrowserlessTimeoutHtmlMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.BROWSERLESS_TIMEOUT_HTML_MS?.trim();
  if (!raw) return DEFAULT_BROWSERLESS_TIMEOUT_HTML_MS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_BROWSERLESS_TIMEOUT_HTML_MS;
  }
  return parsed;
}

export function getBrowserlessTimeoutFullMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env.BROWSERLESS_TIMEOUT_FULL_MS?.trim();
  if (!raw) return DEFAULT_BROWSERLESS_TIMEOUT_FULL_MS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_BROWSERLESS_TIMEOUT_FULL_MS;
  }
  return parsed;
}

export function getBrowserlessTimeoutMs(
  mode: BrowserlessTimeoutMode,
  env: NodeJS.ProcessEnv = process.env,
): number {
  return mode === "html"
    ? getBrowserlessTimeoutHtmlMs(env)
    : getBrowserlessTimeoutFullMs(env);
}

/**
 * Build a Browserless REST/BQL URL with token + connection timeout (unit cap).
 */
export function buildBrowserlessApiUrl(
  endpoint: string,
  token: string,
  mode: BrowserlessTimeoutMode,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const timeoutMs = getBrowserlessTimeoutMs(mode, env);
  const url = new URL(endpoint);
  url.searchParams.set("token", token);
  url.searchParams.set("timeout", String(timeoutMs));
  return url.toString();
}

/** Navigation timeout inside request body — slightly below connection cap. */
export function browserlessGotoTimeoutMs(connectionTimeoutMs: number): number {
  return Math.max(5_000, connectionTimeoutMs - 2_000);
}
