import { cache } from "react";
import { headers, cookies } from "next/headers";
import { LOCALE_COOKIE, localeFromLangQuery } from "@/lib/i18n/locale";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";
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

  return resolveShoppingContext({
    userId: user?.id ?? null,
    host,
    cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: h.get("accept-language"),
    // Path locale wins; ?lang= covers locale-neutral pages (legacy email links).
    pathLocale: localeFromShopPath(pathname) ?? localeFromLangQuery(search),
  });
}

/** Dedupes shopping-context resolution within a single request. */
export const getCachedShoppingContextFromRequest = cache(
  getShoppingContextFromRequest,
);
