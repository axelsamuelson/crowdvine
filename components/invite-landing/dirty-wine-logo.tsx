"use client";

import { useState, useEffect } from "react";

/**
 * Fetches and displays the Dirty Wine logo from site content.
 * Used on business invitation pages.
 */
export function DirtyWineLogo({
  className,
  alt = "Dirty Wine",
}: {
  className?: string;
  alt?: string;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/site-content/header_logo_dirtywine?t=${Date.now()}`, {
      cache: "no-cache",
    })
      .then((r) => r.json())
      .then((data) => {
        const url = data.value?.trim();
        if (url && url !== "null") setLogoUrl(url);
      })
      .catch(() => {});
  }, []);

  if (!logoUrl) {
    return (
      <div
        className={className}
        style={{ minHeight: "60px", backgroundColor: "transparent" }}
      />
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
