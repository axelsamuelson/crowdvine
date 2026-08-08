import { cn } from "@/lib/utils";

import { HomeHeroContent } from "./home-hero-content";
import { HomeHeroImage } from "./home-hero-image";

export function HomeHero({
  className,
  images,
}: {
  className?: string;
  images?: readonly [string, string, string] | string[];
}) {
  return (
    <section
      className={cn(
        "bg-background px-sides pt-top-spacing pb-0",
        className,
      )}
    >
      <div className="grid min-h-[calc(100svh-var(--top-spacing))] w-full grid-rows-[auto_minmax(0,1fr)] gap-8 md:grid-cols-2 md:grid-rows-1 md:items-center md:gap-10 lg:gap-14">
        <HomeHeroContent />
        <HomeHeroImage images={images} />
      </div>
    </section>
  );
}
