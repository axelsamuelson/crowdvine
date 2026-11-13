"use client";

import { cn } from "@/lib/utils";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";
import {
  useSiteLogosOptional,
  type SiteLogos,
} from "@/lib/context/site-logo-provider";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { getSiteWordmark } from "@/lib/b2b/brand";

export function clearFooterLogoCache() {
  window.dispatchEvent(new CustomEvent("footerLogoCacheCleared"));
}

function SiteWordmark({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        "text-3xl font-bold tracking-tight text-current md:text-4xl",
        className,
      )}
    >
      {label}
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

export function FooterLogoSvg({
  className,
  initialLogos,
}: {
  className?: string;
  initialLogos?: SiteLogos;
}) {
  const isDirtyWine = useB2BModeServerHint();
  const wordmark = getSiteWordmark(isDirtyWine);
  const logos = useSiteLogosOptional();
  const footerLogo =
    logos?.footerLogo ?? initialLogos?.footerLogo ?? null;
  const headerLogo =
    logos?.headerLogo ?? initialLogos?.headerLogo ?? null;
  const logoUrl = footerLogo ?? headerLogo;

  if (logoUrl) {
    return (
      <LogoImage
        url={logoUrl}
        alt={`${wordmark} logo`}
        className={cn("h-auto w-auto block shrink-0", className)}
      />
    );
  }

  return <SiteWordmark className={className} label={wordmark} />;
}
