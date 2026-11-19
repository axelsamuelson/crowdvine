import { cache } from "react";
import { headers, cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { resolveRequestUiLocale } from "@/lib/i18n/request-ui-locale";
import { resolveShoppingContext } from "@/lib/shopping-context/resolve";
import type { ShoppingContext } from "@/lib/shopping-context/types";
import { getCurrentUser } from "@/lib/auth";

export async function getShoppingContextFromRequest(options?: {
  skipUser?: boolean;
}): Promise<ShoppingContext> {
  const h = await headers();
  const cookieStore = await cookies();
  const host = h.get("host") ?? null;
  const pathname = h.get("x-pathname")?.trim() || "/";
  const search = h.get("x-search")?.trim() || "";
  const user = options?.skipUser
    ? null
    : await getCurrentUser().catch(() => null);
  const { uiLocale } = resolveRequestUiLocale(pathname, search);

  return resolveShoppingContext({
    userId: user?.id ?? null,
    host,
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: h.get("accept-language"),
    // Path wins over ?lang=; market/currency still come from geo zone, not locale.
    pathLocale: uiLocale,
  });
}

/** Dedupes shopping-context resolution within a single request. */
export const getCachedShoppingContextFromRequest = cache(
  getShoppingContextFromRequest,
);
