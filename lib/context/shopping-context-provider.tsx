"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  intlLocaleForAppLocale,
  type AppLocale,
} from "@/lib/i18n/locale";
import { translate } from "@/lib/i18n/messages";
import { switchAboutPath } from "@/lib/i18n/about-page-content";
import { switchGuidePath } from "@/lib/guides/switch-guide-path";
import { switchProducersDirectoryPath } from "@/lib/i18n/producers-directory";
import {
  getHreflangPath,
  getWineCategoryEn,
  getWineCategorySv,
} from "@/lib/wine-categories";
import {
  homePathForLocale,
  switchProductOrProducerPath,
} from "@/lib/i18n/localized-routes";
import {
  ACTIVE_ZONE_CHANGED_EVENT,
  activeZoneFromChangedEvent,
} from "@/lib/events/active-zone-changed";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import {
  fallbackSekToDisplayRate,
  resolveDisplayCurrencyCode,
} from "@/lib/shopping-context/currency-policy";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";
import type { ShoppingContext } from "@/lib/shopping-context/types";

type ShoppingContextValue = {
  context: ShoppingContext;
  setLocale: (locale: AppLocale) => Promise<void>;
  refresh: () => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const ShoppingContextReact = createContext<ShoppingContextValue | null>(null);

function isFetchAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String(error.name) : "";
  if (name === "AbortError") return true;
  const message = "message" in error ? String(error.message) : "";
  return message === "Failed to fetch" || message.includes("aborted");
}

function setLocaleCookie(locale: AppLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
}

function getLocalizedPath(
  pathname: string,
  newLocale: AppLocale,
): string | null {
  if (pathname === "/" || pathname === "/en") {
    return homePathForLocale(newLocale);
  }

  const productOrProducer = switchProductOrProducerPath(pathname, newLocale);
  if (productOrProducer) return productOrProducer;

  const about = switchAboutPath(pathname, newLocale);
  if (about) return about;

  const producersDirectory = switchProducersDirectoryPath(pathname, newLocale);
  if (producersDirectory) return producersDirectory;

  const guide = switchGuidePath(pathname, newLocale);
  if (guide) return guide;

  // /vin → /wine och vice versa
  if (pathname === "/vin" && newLocale === "en") return "/wine";
  if (pathname === "/wine" && newLocale === "sv") return "/vin";

  // /vin/[kategori] → /wine/[category]
  if (pathname.startsWith("/vin/") && newLocale === "en") {
    const slug = pathname.slice("/vin/".length).split("/")[0];
    if (!slug) return null;
    const category = getWineCategorySv(slug);
    if (category) return getHreflangPath(category);
    // producer/collection slug — byt bara prefix
    return `/wine/${slug}`;
  }

  // /wine/[category] → /vin/[kategori]
  if (pathname.startsWith("/wine/") && newLocale === "sv") {
    const slug = pathname.slice("/wine/".length).split("/")[0];
    if (!slug) return null;
    const category = getWineCategoryEn(slug);
    if (category) return getHreflangPath(category);
    // producer/collection slug — byt bara prefix
    return `/vin/${slug}`;
  }

  return null;
}

function createFallbackShoppingContextValue(
  context: ShoppingContext = fallbackShoppingContext(),
): ShoppingContextValue {
  return {
    context,
    setLocale: async () => {},
    refresh: async () => {},
    t: (key, params) => translate(context.locale, key, params),
  };
}

export function ShoppingContextProvider({
  initialContext,
  children,
}: {
  initialContext: ShoppingContext;
  children: ReactNode;
}) {
  const [context, setContext] = useState(initialContext);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const serverZoneKey = `${initialContext.activeZone.geoZoneId ?? ""}:${initialContext.currencyCode}`;

  useEffect(() => {
    setContext(applyLocalePolicyToContext(initialContext));
  }, [serverZoneKey]);

  const refresh = useCallback(async () => {
    refreshAbortRef.current?.abort("refresh-superseded");
    const ac = new AbortController();
    refreshAbortRef.current = ac;
    try {
      const q =
        typeof window !== "undefined" ? window.location.search : "";
      const res = await fetch(`/api/shopping-context${q}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      if (!res.ok) return;
      const json = (await res.json()) as { shoppingContext?: ShoppingContext };
      if (json.shoppingContext) {
        setContext(applyLocalePolicyToContext(json.shoppingContext));
      }
    } catch (error) {
      if (isFetchAbortError(error)) return;
      /* dev server restart or offline — keep current context */
    } finally {
      if (refreshAbortRef.current === ac) {
        refreshAbortRef.current = null;
      }
    }
  }, []);

  const setLocale = useCallback(
    async (locale: AppLocale) => {
      if (!context.availableLocales.includes(locale)) return;

      setLocaleCookie(locale);

      void fetch("/api/user/preferred-locale", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
        keepalive: true,
      }).catch(() => {});

      const localizedPath = getLocalizedPath(pathname, locale);
      if (localizedPath && localizedPath !== pathname) {
        // Full navigation remounts with server context — skip setState so we
        // don't update fibers that are about to unmount / never finished mount.
        const search =
          typeof window !== "undefined" ? window.location.search : "";
        window.location.assign(`${localizedPath}${search}`);
        return;
      }

      setContext((prev) =>
        applyLocalePolicyToContext({ ...prev, locale }),
      );
      router.refresh();
      await refresh();
    },
    [context.availableLocales, pathname, refresh, router],
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = context.locale;
    }
  }, [context.locale]);

  // ISR shell seeds a static fallback; sync path locale + fetch user/zone prefs client-side.
  // Personal shopping context must never be baked into CDN-cached HTML.
  useEffect(() => {
    const pathLocale = localeFromShopPath(pathname);
    if (pathLocale) {
      setContext((prev) => {
        if (prev.locale === pathLocale) return prev;
        setLocaleCookie(pathLocale);
        return applyLocalePolicyToContext({ ...prev, locale: pathLocale });
      });
    }
    void refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    return () => refreshAbortRef.current?.abort("unmount");
  }, []);

  useEffect(() => {
    const onZoneChange = (event: Event) => {
      const zone = activeZoneFromChangedEvent(event);
      if (zone) {
        setContext((prev) => {
          const currencyCode = resolveDisplayCurrencyCode({
            zoneCurrencyCode: zone.currencyCode,
            marketCurrencyCode: prev.market.currencyCode,
            countryCode: zone.countryCode,
            marketCode: zone.marketCode,
          });
          const next = applyLocalePolicyToContext({
            ...prev,
            activeZone: zone,
            currencyCode,
            sekToDisplayRate:
              currencyCode === prev.currencyCode
                ? prev.sekToDisplayRate
                : fallbackSekToDisplayRate(currencyCode),
          });
          if (next.locale !== prev.locale) {
            setLocaleCookie(next.locale);
          }
          return next;
        });
      }
      void refresh();
    };
    window.addEventListener(ACTIVE_ZONE_CHANGED_EVENT, onZoneChange);
    return () =>
      window.removeEventListener(ACTIVE_ZONE_CHANGED_EVENT, onZoneChange);
  }, [refresh]);

  const value = useMemo<ShoppingContextValue>(
    () => ({
      context,
      setLocale,
      refresh,
      t: (key, params) => translate(context.locale, key, params),
    }),
    [context, setLocale, refresh],
  );

  return (
    <ShoppingContextReact.Provider value={value}>
      {children}
    </ShoppingContextReact.Provider>
  );
}

export function useShoppingContext(): ShoppingContextValue {
  const ctx = useContext(ShoppingContextReact);
  if (ctx) return ctx;
  // Client pages can SSR before the provider client boundary is active (Next.js 16).
  return createFallbackShoppingContextValue();
}

/** Safe when provider is absent (e.g. admin-only subtrees). */
export function useShoppingContextOptional(): ShoppingContextValue | null {
  return useContext(ShoppingContextReact);
}
