"use client";

import { useState, useEffect } from "react";

let alternativeLogoCache: { value: string | null; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minuter

export function clearAlternativeLogoCache() {
  alternativeLogoCache = null;
  window.dispatchEvent(new CustomEvent("alternativeLogoCacheCleared"));
}

export function AlternativeLogoSvg({ className }: { className?: string }) {
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    if (
      alternativeLogoCache &&
      Date.now() - alternativeLogoCache.timestamp < CACHE_DURATION
    ) {
      setLogo(alternativeLogoCache.value);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    fetch(`/api/site-content/alternative_logo?t=${Date.now()}`, {
      signal: controller.signal,
      cache: "no-cache",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch alternative logo");
        return res.json();
      })
      .then((data) => {
        const logoUrl = data.value?.trim();
        if (logoUrl && logoUrl !== "null") {
          setLogo(logoUrl);
          alternativeLogoCache = { value: logoUrl, timestamp: Date.now() };
        } else {
          setLogo(null);
          alternativeLogoCache = { value: null, timestamp: Date.now() };
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Failed to load alternative logo:", err);
        }
        setLogo(null);
        alternativeLogoCache = { value: null, timestamp: Date.now() };
      })
      .finally(() => {
        setLoading(false);
        clearTimeout(timeoutId);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [reloadTrigger]);

  useEffect(() => {
    const handleCacheCleared = () => setReloadTrigger((p) => p + 1);
    window.addEventListener("alternativeLogoCacheCleared", handleCacheCleared);
    return () =>
      window.removeEventListener("alternativeLogoCacheCleared", handleCacheCleared);
  }, []);

  if (loading) {
    return (
      <span
        className={className}
        style={{ display: "inline-block", minWidth: 80, minHeight: 32 }}
      />
    );
  }

  if (logo) {
    const url =
      `${logo}${logo.includes("?") ? "&" : "?"}v=${alternativeLogoCache?.timestamp ?? Date.now()}`;
    return (
      <img
        src={url}
        alt="PACT"
        className={className}
        style={{ objectFit: "contain" }}
        loading="eager"
      />
    );
  }

  return (
    <span className={`font-bold tracking-tight ${className || ""}`}>PACT</span>
  );
}
