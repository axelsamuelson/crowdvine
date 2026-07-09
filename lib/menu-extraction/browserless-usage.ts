import { AsyncLocalStorage } from "node:async_hooks";
import {
  BROWSERLESS_UNITS_PER_FULL_CALL,
  BROWSERLESS_UNITS_PER_HTML_CALL,
} from "./browserless-config";

export interface BrowserlessUsageSummary {
  html_calls: number;
  full_calls: number;
  total_calls: number;
  estimated_units: number;
}

interface UsageContext extends BrowserlessUsageSummary {
  endpoints: string[];
}

const usageContext = new AsyncLocalStorage<UsageContext>();

export function createEmptyBrowserlessUsage(): BrowserlessUsageSummary {
  return {
    html_calls: 0,
    full_calls: 0,
    total_calls: 0,
    estimated_units: 0,
  };
}

function recomputeUnits(ctx: UsageContext): void {
  ctx.estimated_units =
    ctx.html_calls * BROWSERLESS_UNITS_PER_HTML_CALL +
    ctx.full_calls * BROWSERLESS_UNITS_PER_FULL_CALL;
}

/**
 * Record one Browserless API invocation (unblock, content, BQL, function).
 */
export function recordBrowserlessCall(
  kind: "html" | "full",
  endpoint: string,
): void {
  const ctx = usageContext.getStore();
  if (!ctx) return;
  if (kind === "html") ctx.html_calls += 1;
  else ctx.full_calls += 1;
  ctx.total_calls += 1;
  ctx.endpoints.push(endpoint);
  recomputeUnits(ctx);
}

export function getBrowserlessUsage(): BrowserlessUsageSummary | null {
  const ctx = usageContext.getStore();
  if (!ctx) return null;
  return {
    html_calls: ctx.html_calls,
    full_calls: ctx.full_calls,
    total_calls: ctx.total_calls,
    estimated_units: ctx.estimated_units,
  };
}

export async function withBrowserlessUsageTracking<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; browserless: BrowserlessUsageSummary }> {
  const ctx: UsageContext = {
    ...createEmptyBrowserlessUsage(),
    endpoints: [],
  };
  const result = await usageContext.run(ctx, fn);
  return {
    result,
    browserless: {
      html_calls: ctx.html_calls,
      full_calls: ctx.full_calls,
      total_calls: ctx.total_calls,
      estimated_units: ctx.estimated_units,
    },
  };
}
