"use client";

import { useState, useEffect } from "react";

// Cache för att undvika upprepade API-anrop
let logoCache: { value: string | null; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minuter (kortare cache för snabbare uppdateringar)

// Preload loggan när komponenten mountas första gången
let hasPreloaded = false;

// Funktion för att rensa cache (anropas från admin när loggan uppdateras)
export function clearLogoCache() {
  logoCache = null;
  hasPreloaded = false;
  // Trigger reload av alla LogoSvg komponenter
  window.dispatchEvent(new CustomEvent("logoCacheCleared"));
}

export function LogoSvg({ className }: { className?: string }) {
  const [headerLogo, setHeaderLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    // Kontrollera cache först
    if (logoCache && Date.now() - logoCache.timestamp < CACHE_DURATION) {
      setHeaderLogo(logoCache.value);
      setLoading(false);
      return;
    }

    // Hämta header_logo från API med längre timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 sek timeout (ökad från 2)

    fetch(`/api/site-content/header_logo?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-cache", // Ingen cache för att få senaste versionen
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const logoValue = data.value || null;

        // Uppdatera cache
        logoCache = {
          value: logoValue,
          timestamp: Date.now(),
        };

        setHeaderLogo(logoValue);
        setLoading(false);

        // Preload bilden för nästa gång
        if (logoValue && !hasPreloaded) {
          const img = new Image();
          img.src = logoValue;
          hasPreloaded = true;
        }
      })
      .catch((err) => {
        // Don't log AbortError (normal timeout behavior)
        if (err.name !== "AbortError") {
          console.warn("Error fetching header logo:", err);
        }

        // Set loading to false and use PACT text instead of ACME fallback
        setLoading(false);
        setHeaderLogo(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }, [reloadTrigger]);

  // Lyssna på cache-clearing events
  useEffect(() => {
    const handleCacheCleared = () => {
      setReloadTrigger((prev) => prev + 1);
    };

    window.addEventListener("logoCacheCleared", handleCacheCleared);
    return () =>
      window.removeEventListener("logoCacheCleared", handleCacheCleared);
  }, []);

  // Om det laddas, visa en transparent placeholder för att undvika layout shift
  if (loading) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Invisible placeholder med samma storlek som loggan */}
        <div style={{ width: "100%", height: "100%" }} />
      </div>
    );
  }

  // Om det finns en uppladdad logga, visa den
  if (headerLogo) {
    return (
      <img
        src={headerLogo}
        alt="CrowdVine Logo"
        className={className}
        style={{ objectFit: "contain" }}
        loading="eager" // Ladda direkt
        fetchPriority="high" // Hög prioritet
      />
    );
  }

  // Fallback till PACT text om ingen logga är uppladdad
  return (
    <div className={`text-2xl font-bold tracking-tight ${className || ""}`}>
      PACT
    </div>
  );
}
