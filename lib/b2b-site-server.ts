import { headers } from "next/headers";
import { isDirtywineHost } from "@/lib/b2b-site";

/**
 * SSR-safe dirtywine detection from request Host header.
 * Query (?b2b=1) is not available here — client hooks reconcile after hydration.
 */
export async function getIsDirtywineSiteFromHeaders(): Promise<boolean> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return isDirtywineHost(host, null);
}
