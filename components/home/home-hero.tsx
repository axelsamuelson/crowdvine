import { cn } from "@/lib/utils";
import type { HomepageHeroCopy } from "@/lib/homepage-hero-copy";

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
  return (
    <section
      className={cn(
        "bg-background px-sides pt-top-spacing pb-0",
        className,
      )}
    >
      <div className="grid w-full grid-rows-[auto_auto] gap-4 md:min-h-[calc(100svh-var(--top-spacing))] md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-10 lg:gap-14">
        <HomeHeroContent
          titleLines={copy?.titleLines}
          subtitle={copy?.subtitle}
        />
        <HomeHeroImage images={images} />
      </div>
    </section>
  );
}
