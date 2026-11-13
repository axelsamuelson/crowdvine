"use client";

import { cn } from "@/lib/utils";
import {
  useSiteLogosOptional,
  type SiteLogos,
} from "@/lib/context/site-logo-provider";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
import { getSiteWordmark } from "@/lib/b2b/brand";

export function clearLogoCache() {
  window.dispatchEvent(new CustomEvent("logoCacheCleared"));
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
        "text-2xl font-bold tracking-tight text-foreground",
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
      width={140}
      height={56}
      style={{ objectFit: "contain" }}
      loading="eager"
      fetchPriority="high"
    />
  );
}

export function LogoSvg({
  className,
  initialLogos,
}: {
  className?: string;
  initialLogos?: SiteLogos;
}) {
  const isDirtyWine = useB2BModeServerHint();
  const wordmark = getSiteWordmark(isDirtyWine);
  const logos = useSiteLogosOptional();
  const headerLogo =
    logos?.headerLogo ?? initialLogos?.headerLogo ?? null;

  if (headerLogo) {
    return (
      <LogoImage
        url={headerLogo}
        alt={`${wordmark} logo`}
        className={className}
      />
    );
  }

  return <SiteWordmark className={className} label={wordmark} />;
}
