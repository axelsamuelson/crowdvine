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
import {
  getHreflangPath,
  getWineCategoryEn,
  getWineCategorySv,
} from "@/lib/wine-categories";
import { switchProductOrProducerPath } from "@/lib/i18n/localized-routes";
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
  const productOrProducer = switchProductOrProducerPath(pathname, newLocale);
  if (productOrProducer) return productOrProducer;

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
    refreshAbortRef.current?.abort();
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

  const setLocale = useCallback(async (locale: AppLocale) => {
    let applied = false;
    setContext((prev) => {
      if (!prev.availableLocales.includes(locale)) return prev;
      applied = true;
      return applyLocalePolicyToContext({ ...prev, locale });
    });
    if (!applied) return;

    setLocaleCookie(locale);

    void fetch("/api/user/preferred-locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
      keepalive: true,
    }).catch(() => {});

    const localizedPath = getLocalizedPath(pathname, locale);
    if (localizedPath && localizedPath !== pathname) {
      // Full navigation avoids flaky RSC soft-nav when cookie + URL both change.
      const search =
        typeof window !== "undefined" ? window.location.search : "";
      window.location.assign(`${localizedPath}${search}`);
      return;
    }

    router.refresh();
    await refresh();
  }, [pathname, refresh, router]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = context.locale;
    }
  }, [context.locale]);

  useEffect(() => {
    return () => refreshAbortRef.current?.abort();
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
