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
        "relative overflow-x-clip bg-background px-sides pt-top-spacing pb-2 md:pb-0",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-[radial-gradient(120%_70%_at_50%_-10%,rgba(120,113,108,0.10),transparent_70%)] md:h-full md:bg-[radial-gradient(90%_70%_at_85%_40%,rgba(120,113,108,0.08),transparent_65%)]"
      />

      <div className="relative grid w-full min-w-0 grid-rows-[auto_auto] gap-4 md:min-h-[calc(100svh-var(--top-spacing))] md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-10 lg:gap-14">
        <HomeHeroContent
          titleLines={copy?.titleLines}
          subtitle={copy?.subtitle}
        />
        <HomeHeroImage images={images} />
      </div>
    </section>
  );
}
