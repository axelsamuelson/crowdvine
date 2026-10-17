import { headers } from "next/headers";
import { isDirtywineHost } from "@/lib/b2b-site";

/** Request host for B2B detection (x-forwarded-host preferred). */
export async function getRequestHostFromHeaders(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-host") ?? h.get("host");
}

/**
 * SSR-safe dirtywine detection from request Host header.
 * Query (?b2b=1) is not available here — client hooks reconcile after hydration.
 */
export async function getIsDirtywineSiteFromHeaders(): Promise<boolean> {
  const host = await getRequestHostFromHeaders();
  return isDirtywineHost(host, null);
}
