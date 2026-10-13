"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { HOMEPAGE_HERO_IMAGE_DEFAULTS } from "@/lib/homepage-hero-images";

const HERO_FRAMES = [
  {
    mobileClassName: "h-48",
    desktopClassName: "md:mt-0 md:h-[58%] md:min-h-[12rem]",
    sizes: "(max-width: 767px) 58vw, 16vw",
    priority: true,
  },
  {
    mobileClassName: "mt-2 h-56",
    desktopClassName: "md:mt-[8%] md:h-[72%] md:min-h-[14rem]",
    sizes: "(max-width: 767px) 58vw, 18vw",
    priority: false,
  },
  {
    mobileClassName: "mt-1 h-52",
    desktopClassName: "md:mt-[4%] md:h-[62%] md:min-h-[13rem]",
    sizes: "(max-width: 767px) 58vw, 16vw",
    priority: false,
  },
] as const;

/** Three rounded image frames — contained snap strip on mobile, staggered column on desktop. */
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
    <div className="order-1 min-w-0 w-full max-w-full md:order-2 md:h-full md:min-h-[28rem]">
      <div
        className={cn(
          // Isolate horizontal scroll so wide slides cannot expand the page.
          "flex w-full min-w-0 max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "md:h-full md:items-center md:gap-4 md:overflow-visible md:pb-0 md:snap-none",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {frames.map((frame, index) => (
          <motion.div
            key={`${frame.src}-${index}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-2xl bg-stone-200",
              // Mobile: shorter cards with peek of the next slide
              "w-[min(58vw,14.5rem)] snap-start",
              frame.mobileClassName,
              // Desktop: flex columns with staggered heights
              "md:w-auto md:min-w-0 md:flex-1 md:shrink md:snap-align-none",
              frame.desktopClassName,
            )}
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
