"use client";

import { cn } from "@/lib/utils";
import {
  useSiteLogosOptional,
  type SiteLogos,
} from "@/lib/context/site-logo-provider";
import { useB2BModeServerHint } from "@/lib/context/b2b-mode-context";
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

function DirtyWineWordmark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "text-xl font-bold tracking-tight text-foreground md:text-2xl",
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
  const logos = useSiteLogosOptional();
  const isDirtywineSite = useB2BModeServerHint();
  const headerLogo =
    logos?.headerLogo ?? initialLogos?.headerLogo ?? null;

  if (headerLogo) {
    return (
      <LogoImage
        url={headerLogo}
        alt={isDirtywineSite ? "Dirty Wine logo" : "PACT Wines logo"}
        className={className}
      />
    );
  }

  if (isDirtywineSite) {
    return <DirtyWineWordmark className={className} />;
  }

  return <PactWordmark className={className} />;
}
