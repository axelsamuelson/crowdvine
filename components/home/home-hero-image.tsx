"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { HOMEPAGE_HERO_IMAGE_DEFAULTS } from "@/lib/homepage-hero-images";

const HERO_FRAME_LAYOUT = [
  {
    className: "mt-0 h-44 min-h-0 md:h-[58%] md:min-h-[12rem]",
    sizes: "(max-width: 767px) 30vw, 16vw",
    priority: true,
  },
  {
    className: "mt-3 h-52 min-h-0 md:mt-[8%] md:h-[72%] md:min-h-[14rem]",
    sizes: "(max-width: 767px) 34vw, 18vw",
    priority: true,
  },
  {
    className: "mt-1.5 h-48 min-h-0 md:mt-[4%] md:h-[62%] md:min-h-[13rem]",
    sizes: "(max-width: 767px) 30vw, 16vw",
    priority: false,
  },
] as const;

/** Three rounded image frames to the right of hero copy. */
export function HomeHeroImage({
  images = [...HOMEPAGE_HERO_IMAGE_DEFAULTS],
}: {
  images?: readonly [string, string, string] | string[];
}) {
  const reduceMotion = useReducedMotion();
  const frames = HERO_FRAME_LAYOUT.map((layout, index) => ({
    ...layout,
    src: images[index]?.trim() || HOMEPAGE_HERO_IMAGE_DEFAULTS[index],
  }));

  return (
    <div className="order-1 flex h-auto w-full items-end gap-2 sm:gap-3 md:order-2 md:h-full md:min-h-[28rem] md:items-center md:gap-4">

      {frames.map((frame, index) => (
        <motion.div
          key={`${frame.src}-${index}`}
          className={cn(
            "relative min-w-0 flex-1 overflow-hidden rounded-2xl bg-stone-200",
            frame.className,
          )}
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
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
            className="object-cover"
            sizes={frame.sizes}
          />
        </motion.div>
      ))}
    </div>
  );
}
