"use client";

import { cn } from "@/lib/utils";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";
import { useSiteLogosOptional } from "@/lib/context/site-logo-provider";

export function clearFooterLogoCache() {
  window.dispatchEvent(new CustomEvent("footerLogoCacheCleared"));
}

function PactWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "text-3xl font-bold tracking-tight text-current md:text-4xl",
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

export function FooterLogoSvg({ className }: { className?: string }) {
  const logos = useSiteLogosOptional();
  const footerLogo = logos?.footerLogo ?? null;
  const headerLogo = logos?.headerLogo ?? null;
  const logoUrl = footerLogo ?? headerLogo;

  if (logoUrl) {
    return (
      <LogoImage
        url={logoUrl}
        alt="PACT Wines logo"
        className={cn("h-auto w-auto block shrink-0", className)}
      />
    );
  }

  return <PactWordmark className={className} />;
}
