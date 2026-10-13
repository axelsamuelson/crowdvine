"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { HOMEPAGE_HERO_IMAGE_DEFAULTS } from "@/lib/homepage-hero-images";

const HERO_FRAMES = [
  {
    className: "mt-0 h-[58%] min-h-[12rem]",
    sizes: "16vw",
    priority: false,
  },
  {
    className: "mt-[8%] h-[72%] min-h-[14rem]",
    sizes: "18vw",
    priority: false,
  },
  {
    className: "mt-[4%] h-[62%] min-h-[13rem]",
    sizes: "16vw",
    priority: false,
  },
] as const;

/** Desktop-only staggered three-frame collage (mobile uses full-bleed in HomeHero). */
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
    <div className="order-2 hidden h-full min-h-[28rem] w-full min-w-0 md:flex md:items-center md:gap-4">
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
            quality={70}
            className="object-cover"
            sizes={frame.sizes}
            draggable={false}
          />
        </motion.div>
      ))}
    </div>
  );
}
