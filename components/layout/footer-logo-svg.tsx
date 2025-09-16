"use client";

import { useState, useEffect } from "react";

// Cache för att undvika upprepade API-anrop
let footerLogoCache: { value: string | null; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minuter (kortare cache för snabbare uppdateringar)

// Preload loggan när komponenten mountas första gången
let hasPreloadedFooter = false;

// Funktion för att rensa cache (anropas från admin när loggan uppdateras)
export function clearFooterLogoCache() {
  footerLogoCache = null;
  hasPreloadedFooter = false;
  // Trigger reload av alla FooterLogoSvg komponenter
  window.dispatchEvent(new CustomEvent("footerLogoCacheCleared"));
}

export function FooterLogoSvg({ className }: { className?: string }) {
  const [footerLogo, setFooterLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    // Kontrollera cache först
    if (
      footerLogoCache &&
      Date.now() - footerLogoCache.timestamp < CACHE_DURATION
    ) {
      setFooterLogo(footerLogoCache.value);
      setLoading(false);
      return;
    }

    // Hämta footer_logo från API med timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 sek timeout

    fetch(`/api/site-content/footer_logo?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-cache", // Ingen cache för att få senaste versionen
    })
      .then((response) => {
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error("Failed to fetch footer logo");
        }
        return response.json();
      })
      .then((data) => {
        const logoUrl = data.value?.trim();
        if (logoUrl && logoUrl !== "null") {
          setFooterLogo(logoUrl);
          // Uppdatera cache
          footerLogoCache = { value: logoUrl, timestamp: Date.now() };

          // Preload bilden för första gången
          if (!hasPreloadedFooter) {
            const img = new Image();
            img.src = logoUrl;
            hasPreloadedFooter = true;
          }
        } else {
          setFooterLogo(null);
          footerLogoCache = { value: null, timestamp: Date.now() };
        }
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.warn("Failed to load footer logo:", error);
        setFooterLogo(null);
        footerLogoCache = { value: null, timestamp: Date.now() };
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadTrigger]);

  // Lyssna på cache-clearing events
  useEffect(() => {
    const handleCacheCleared = () => {
      setReloadTrigger((prev) => prev + 1);
    };

    window.addEventListener("footerLogoCacheCleared", handleCacheCleared);
    return () =>
      window.removeEventListener("footerLogoCacheCleared", handleCacheCleared);
  }, []);

  // Visa transparent placeholder medan vi laddar för att undvika layout shift
  if (loading) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: "transparent",
          minHeight: "60px", // Ungefärlig höjd för footer logo
        }}
      />
    );
  }

  // Om vi har en footer logo, visa den
  if (footerLogo) {
    return (
      <img
        src={footerLogo}
        alt="Footer Logo"
        className={className}
        style={{ objectFit: "contain" }}
        loading="eager"
        fetchPriority="high"
        onLoad={() => {
          // Preload för framtida användning
          if (!hasPreloadedFooter) {
            const img = new Image();
            img.src = footerLogo;
            hasPreloadedFooter = true;
          }
        }}
      />
    );
  }

  // Fallback till standard SVG om ingen footer logo finns
  return (
    <svg
      className={className}
      viewBox="0 0 200 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="200" height="60" fill="currentColor" opacity="0.1" />
      <text
        x="100"
        y="35"
        textAnchor="middle"
        fill="currentColor"
        fontSize="16"
        fontWeight="bold"
      >
        Footer Logo
      </text>
    </svg>
  );
}
