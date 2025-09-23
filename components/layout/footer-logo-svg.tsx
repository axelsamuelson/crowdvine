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
      width="292"
      height="61"
      viewBox="0 0 292 61"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`md:basis-3/4 max-md:w-full max-w-[1200px] h-auto block ${className || ""}`}
    >
      <path
        d="M0 58.9432L20.7844 1.29902H35.3984L56.1828 58.9432H43.3549L39.1331 46.6837H16.9685L12.7467 58.9432H0ZM20.4596 36.535H35.7232L28.0914 14.2893L20.4596 36.535Z"
        fill="currentColor"
      />
      <path
        d="M82.7703 60.2422C67.0196 60.2422 55.7343 49.0381 55.7343 30.2023C55.7343 11.8536 66.3701 0 83.0138 0C98.115 0 106.234 7.71295 108.67 21.4339L95.8417 21.921C94.5427 14.6952 90.1585 10.3922 83.0138 10.3922C73.8395 10.3922 68.481 18.1863 68.481 30.2023C68.481 42.3806 74.083 49.85 82.9326 49.85C90.6456 49.85 94.8674 45.2223 96.0041 37.4281L108.913 37.9153C106.559 51.9609 97.7902 60.2422 82.7703 60.2422Z"
        fill="currentColor"
      />
      <path
        d="M115.054 58.9432V1.29902H131.535L146.23 43.2737L160.844 1.29902H177.326V58.9432H164.985V21.5963L151.426 58.7808H140.872L127.394 21.5963V58.9432H115.054Z"
        fill="currentColor"
      />
      <path
        d="M186.205 58.9432V1.29902H226.312V11.6912H198.546V24.925H225.338V35.1548H198.546V48.551H226.962V58.9432H186.205Z"
        fill="currentColor"
      />
      <path
        d="M262.041 59.9175C245.479 59.9175 232.083 46.5213 232.083 29.8775C232.083 13.3962 245.479 0 262.041 0C278.604 0 292 13.3962 292 29.8775C292 46.5213 278.604 59.9175 262.041 59.9175ZM262.041 52.4481C274.138 52.4481 284.368 42.4618 284.368 29.8775C284.368 17.4556 274.138 7.46939 262.041 7.46939C249.944 7.46939 239.714 17.4556 239.714 29.8775C239.714 42.4618 249.944 52.4481 262.041 52.4481ZM262.366 46.2777C252.867 46.2777 246.372 39.6202 246.372 29.8775C246.372 20.2161 252.867 13.6397 262.366 13.6397C270.566 13.6397 276.736 18.8358 277.467 26.3864L268.78 26.7924C268.212 22.9765 265.695 20.7032 262.366 20.7032C257.982 20.7032 255.059 24.1943 255.059 29.8775C255.059 35.642 257.982 39.1331 262.366 39.1331C265.938 39.1331 268.455 36.8598 268.942 32.7192L277.711 33.0439C276.98 40.8381 270.81 46.2777 262.366 46.2777Z"
        fill="currentColor"
      />
    </svg>
  );
}
