"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";
import { producerBoxesPath } from "@/lib/producer-boxes/config";
import { cn } from "@/lib/utils";

// Same corner radius as the mobile cart trigger (rounded-sm).
const heroButtonBaseClassName =
  "inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-sm px-3 text-sm font-medium transition-colors sm:flex-none sm:min-w-[10rem] sm:px-6";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function HomeHeroContent({
  titleLines,
}: {
  titleLines?: string[];
  /** Kept for call-site compatibility; hero no longer renders body copy. */
  subtitle?: string;
}) {
  const { t, context } = useTranslations();
  const paths = useLocalizedPaths();
  const reduceMotion = useReducedMotion();

  const resolvedTitleLines =
    titleLines && titleLines.length > 0
      ? titleLines
      : [t("home.heroTitleBefore"), t("home.heroTitleMiddle")].filter(Boolean);
  const wineBoxesHref = producerBoxesPath(context.locale);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        // Mobile: fill the hero and pin CTAs to the bottom of the section
        "h-full justify-between pt-10 sm:pt-12",
        // Desktop: left column, vertically centered
        "md:order-1 md:h-auto md:justify-center md:pt-0 md:py-10",
      )}
    >
      <motion.div
        className="min-w-0 max-w-xl"
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: reduceMotion
              ? undefined
              : { staggerChildren: 0.1, delayChildren: 0.08 },
          },
        }}
      >
        <motion.div variants={fadeUp} transition={transition} className="min-w-0">
          <h1
            className={cn(
              "max-w-full text-balance break-words font-semibold uppercase tracking-[-0.02em]",
              // Mobile: larger light type over the photo
              "text-[2.35rem] leading-[1.05] text-white drop-shadow-sm sm:text-5xl",
              // Desktop: larger dark type
              "md:text-5xl md:leading-[0.95] md:tracking-tight md:text-foreground md:drop-shadow-none lg:text-6xl",
            )}
          >
            {resolvedTitleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </h1>
        </motion.div>
      </motion.div>

      <motion.div
        initial={reduceMotion ? false : "hidden"}
        animate="show"
        variants={fadeUp}
        transition={{
          ...transition,
          delay: reduceMotion ? 0 : 0.18,
        }}
        className="flex w-full min-w-0 max-w-lg flex-row gap-2.5 pt-8 sm:gap-3 md:pt-8"
      >
        <Link
          href={paths.shop}
          className={cn(
            heroButtonBaseClassName,
            // Mobile: light primary on photo
            "bg-white text-stone-900 hover:bg-white/90",
            // Desktop: dark primary
            "md:bg-stone-900 md:text-white md:hover:bg-stone-800",
          )}
        >
          {t("nav.shopAll")}
        </Link>
        <Link
          href={wineBoxesHref}
          className={cn(
            heroButtonBaseClassName,
            "border border-white/80 bg-transparent text-white hover:bg-white/10",
            "md:border-stone-300 md:bg-white md:text-stone-900 md:hover:border-stone-400 md:hover:bg-stone-50",
          )}
        >
          {t("shop.producerBoxesCta")}
        </Link>
      </motion.div>
    </div>
  );
}
