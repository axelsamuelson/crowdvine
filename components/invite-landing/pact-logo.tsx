"use client";

import { useState, useEffect } from "react";

/**
 * Fetches and displays the PACT logo from site content.
 * Used on consumer invitation pages (membership card).
 */
export function PactLogo({
  className,
  alt = "PACT",
}: {
  className?: string;
  alt?: string;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/site-content/header_logo_pact?t=${Date.now()}`, {
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
      <span className={`font-bold tracking-tight ${className || ""}`}>
        {alt}
      </span>
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
