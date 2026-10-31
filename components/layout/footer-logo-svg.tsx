"use client";

import { cn } from "@/lib/utils";
import { logoUrlWithVersion } from "@/lib/site-logos-utils";
import {
  useSiteLogosOptional,
  type SiteLogos,
} from "@/lib/context/site-logo-provider";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";

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

function DirtyWineWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "text-2xl font-bold tracking-tight text-current md:text-4xl",
        className,
      )}
    >
      Dirty Wine
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
  const logos = useSiteLogosOptional();
  const isDirtywineSite = useB2BModeServerHint();
  const footerLogo =
    logos?.footerLogo ?? initialLogos?.footerLogo ?? null;
  const headerLogo =
    logos?.headerLogo ?? initialLogos?.headerLogo ?? null;
  const logoUrl = footerLogo ?? headerLogo;

  if (logoUrl) {
    return (
      <LogoImage
        url={logoUrl}
        alt={isDirtywineSite ? "Dirty Wine logo" : "PACT Wines logo"}
        className={cn("h-auto w-auto block shrink-0", className)}
      />
    );
  }

  if (isDirtywineSite) {
    return <DirtyWineWordmark className={className} />;
  }

  return <PactWordmark className={className} />;
}
