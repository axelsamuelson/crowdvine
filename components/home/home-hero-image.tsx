"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const HERO_FRAMES = [
  {
    src: "/images/hero_bild_5.webp",
    className: "mt-0 h-[58%] min-h-[12rem]",
    sizes: "(max-width: 767px) 30vw, 16vw",
    priority: true,
  },
  {
    src: "/images/hero_bild_4.webp",
    className: "mt-[8%] h-[72%] min-h-[14rem]",
    sizes: "(max-width: 767px) 34vw, 18vw",
    priority: true,
  },
  {
    src: "/images/hero-side-2.png",
    className: "mt-[4%] h-[62%] min-h-[13rem]",
    sizes: "(max-width: 767px) 30vw, 16vw",
    priority: false,
  },
] as const;

/** Three rounded image frames to the right of hero copy. */
export function HomeHeroImage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="order-1 flex h-[min(52vh,28rem)] w-full items-end gap-2 sm:gap-3 md:order-2 md:h-full md:min-h-[28rem] md:items-center md:gap-4">
      {HERO_FRAMES.map((frame, index) => (
        <motion.div
          key={frame.src}
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
