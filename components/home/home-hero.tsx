import { cn } from "@/lib/utils";

import { HomeHeroContent } from "./home-hero-content";
import { HomeHeroImage } from "./home-hero-image";

export function HomeHero({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "bg-background p-sides pt-top-spacing pointer-events-none",
        className,
      )}
    >
      <div className="relative min-h-fold w-full overflow-hidden rounded-[12px]">
        <HomeHeroImage />
        <HomeHeroContent />
      </div>
    </section>
  );
}
