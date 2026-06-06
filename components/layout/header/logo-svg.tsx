"use client";

import { cn } from "@/lib/utils";
import { useSiteLogosOptional } from "@/lib/context/site-logo-provider";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";

export function clearLogoCache() {
  window.dispatchEvent(new CustomEvent("logoCacheCleared"));
}

function PactWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "text-2xl font-bold tracking-tight text-foreground",
        className,
      )}
    >
      PACT
    </div>
  );
}

function LogoImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={logoUrlWithVersion(url)}
      alt={alt}
      className={className}
      style={{ objectFit: "contain" }}
      loading="eager"
      fetchPriority="high"
    />
  );
}

export function LogoSvg({ className }: { className?: string }) {
  const logos = useSiteLogosOptional();
  const headerLogo = logos?.headerLogo ?? null;

  if (headerLogo) {
    return (
      <LogoImage url={headerLogo} alt="PACT Wines logo" className={className} />
    );
  }

  return <PactWordmark className={className} />;
}
