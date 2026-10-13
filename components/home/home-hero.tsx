import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HomepageHeroCopy } from "@/lib/homepage-hero-copy";
import { HOMEPAGE_HERO_IMAGE_DEFAULTS } from "@/lib/homepage-hero-images";

import { HomeHeroContent } from "./home-hero-content";
import { HomeHeroImage } from "./home-hero-image";

export function HomeHero({
  className,
  images,
  copy,
}: {
  className?: string;
  images?: readonly [string, string, string] | string[];
  copy?: Pick<HomepageHeroCopy, "titleLines" | "subtitle">;
}) {
  const resolved = [
    images?.[0]?.trim() || HOMEPAGE_HERO_IMAGE_DEFAULTS[0],
    images?.[1]?.trim() || HOMEPAGE_HERO_IMAGE_DEFAULTS[1],
    images?.[2]?.trim() || HOMEPAGE_HERO_IMAGE_DEFAULTS[2],
  ] as const;
  // Center frame is the strongest lifestyle shot — use it full-bleed on mobile.
  const mobileBleedSrc = resolved[1] || resolved[0];

  return (
    <section
      className={cn(
        "relative overflow-x-clip bg-background",
        // Mobile: edge-to-edge viewport hero
        "min-h-[100svh]",
        // Desktop: original padded split layout
        "md:min-h-0 md:px-sides md:pt-top-spacing md:pb-0",
        className,
      )}
    >
      {/* Mobile full-bleed image */}
      <div className="absolute inset-0 md:hidden" aria-hidden>
        <Image
          src={mobileBleedSrc}
          alt=""
          fill
          priority
          fetchPriority="high"
          quality={82}
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Readability scrims — keep photo present, text legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55" />
      </div>

      <div
        className={cn(
          "relative grid w-full min-w-0",
          // Mobile: fill viewport, content sits over the photo
          "min-h-[100svh] grid-rows-1 px-sides pb-10 pt-top-spacing",
          // Desktop: two-column collage + copy
          "md:min-h-[calc(100svh-var(--top-spacing))] md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-10 md:px-0 md:pb-0 md:pt-0 lg:gap-14",
        )}
      >
        <HomeHeroContent
          titleLines={copy?.titleLines}
          subtitle={copy?.subtitle}
        />
        <HomeHeroImage images={resolved} />
      </div>
    </section>
  );
}
