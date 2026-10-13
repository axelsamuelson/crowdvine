"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { HOMEPAGE_HERO_IMAGE_DEFAULTS } from "@/lib/homepage-hero-images";

const HERO_FRAMES = [
  {
    className:
      "md:mt-0 md:aspect-auto md:h-[58%] md:min-h-[12rem] md:w-auto md:min-w-0 md:flex-1 md:shrink",
    sizes: "(max-width: 767px) 72vw, 16vw",
    priority: true,
  },
  {
    className:
      "md:mt-[8%] md:aspect-auto md:h-[72%] md:min-h-[14rem] md:w-auto md:min-w-0 md:flex-1 md:shrink",
    sizes: "(max-width: 767px) 72vw, 18vw",
    priority: false,
  },
  {
    className:
      "md:mt-[4%] md:aspect-auto md:h-[62%] md:min-h-[13rem] md:w-auto md:min-w-0 md:flex-1 md:shrink",
    sizes: "(max-width: 767px) 72vw, 16vw",
    priority: false,
  },
] as const;

/** Three rounded image frames — snap carousel on mobile, staggered column on desktop. */
export function HomeHeroImage({
  images = [...HOMEPAGE_HERO_IMAGE_DEFAULTS],
}: {
  images?: readonly [string, string, string] | string[];
}) {
  const reduceMotion = useReducedMotion();
  const frames = HERO_FRAMES.map((layout, index) => ({
    ...layout,
    src: images[index]?.trim() || HOMEPAGE_HERO_IMAGE_DEFAULTS[index],
  }));

  return (
    <div
      className={cn(
        "order-1 w-full md:order-2 md:h-full md:min-h-[28rem]",
        // Full-bleed strip on mobile; padded grid column on desktop.
        "-mx-sides md:mx-0",
      )}
    >
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain scroll-ps-sides px-sides pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:h-full md:items-center md:gap-4 md:overflow-visible md:scroll-ps-0 md:px-0 md:pb-0 md:snap-none",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {frames.map((frame, index) => (
          <motion.div
            key={`${frame.src}-${index}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-2xl bg-stone-200",
              // Mobile: tall portrait cards with next-image peek
              "aspect-[3/4] w-[min(72vw,18rem)] snap-start",
              frame.className,
            )}
            // Keep the LCP frame visible in HTML — animate only secondary frames.
            initial={
              reduceMotion || frame.priority ? false : { opacity: 0, y: 24 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion || frame.priority
                ? { duration: 0 }
                : {
                    duration: 0.7,
                    delay: 0.12 + index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }
            }
          >
            <Image
              src={frame.src}
              alt=""
              aria-hidden
              fill
              priority={frame.priority}
              fetchPriority={frame.priority ? "high" : undefined}
              quality={frame.priority ? 80 : 70}
              className="object-cover"
              sizes={frame.sizes}
              draggable={false}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
