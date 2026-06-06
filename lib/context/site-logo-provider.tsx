"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";

export type SiteLogos = {
  headerLogo: string | null;
  footerLogo: string | null;
};

type SiteLogoContextValue = SiteLogos & {
  refreshLogos: () => Promise<void>;
};

const SiteLogoContext = createContext<SiteLogoContextValue | null>(null);

function isAbortError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "AbortError"
  );
}

async function fetchLogo(key: "header_logo" | "footer_logo"): Promise<string | null> {
  const res = await fetch(`/api/site-content/${key}?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { value?: string };
  const trimmed = data.value?.trim();
  return trimmed && trimmed !== "null" ? trimmed : null;
}

export function SiteLogoProvider({
  initialLogos,
  children,
}: {
  initialLogos: SiteLogos;
  children: ReactNode;
}) {
  const [logos, setLogos] = useState<SiteLogos>(initialLogos);

  useEffect(() => {
    setLogos(initialLogos);
  }, [initialLogos.headerLogo, initialLogos.footerLogo]);

  const refreshLogos = useCallback(async () => {
    try {
      const [headerLogo, footerLogo] = await Promise.all([
        fetchLogo("header_logo"),
        fetchLogo("footer_logo"),
      ]);
      setLogos({ headerLogo, footerLogo });
    } catch (error) {
      if (!isAbortError(error)) {
        console.warn("Failed to refresh site logos:", error);
      }
    }
  }, []);

  useEffect(() => {
    const onLogoCacheCleared = () => {
      void refreshLogos();
    };
    window.addEventListener("logoCacheCleared", onLogoCacheCleared);
    window.addEventListener("footerLogoCacheCleared", onLogoCacheCleared);
    return () => {
      window.removeEventListener("logoCacheCleared", onLogoCacheCleared);
      window.removeEventListener("footerLogoCacheCleared", onLogoCacheCleared);
    };
  }, [refreshLogos]);

  const value = useMemo<SiteLogoContextValue>(
    () => ({
      ...logos,
      refreshLogos,
    }),
    [logos, refreshLogos],
  );

  return (
    <SiteLogoContext.Provider value={value}>{children}</SiteLogoContext.Provider>
  );
}

export function useSiteLogos(): SiteLogoContextValue {
  const ctx = useContext(SiteLogoContext);
  if (!ctx) {
    throw new Error("useSiteLogos must be used within SiteLogoProvider");
  }
  return ctx;
}

export function useSiteLogosOptional(): SiteLogoContextValue | null {
  return useContext(SiteLogoContext);
}
