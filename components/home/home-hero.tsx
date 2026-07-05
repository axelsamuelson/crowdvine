import { cn } from "@/lib/utils";

import { HomeHeroContent } from "./home-hero-content";
import { HomeHeroImage } from "./home-hero-image";

export function HomeHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "bg-background px-sides pt-top-spacing pb-0 pointer-events-none",
        className,
      )}
    >
      <div className="grid min-h-[calc(100svh-var(--top-spacing))] w-full overflow-hidden rounded-[12px] bg-white grid-rows-[minmax(0,1fr)_auto] md:grid-cols-2 md:grid-rows-1">
        <HomeHeroContent />
        <HomeHeroImage />
      </div>
    </section>
  );
}
