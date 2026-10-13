"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

import { useOptionalTasteQuizPanel } from "./home-taste-quiz-panel";

const heroButtonBaseClassName =
  "inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-full px-3 text-sm font-medium transition-colors sm:flex-none sm:min-w-[10rem] sm:px-6";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export function HomeHeroContent({
  titleLines,
  subtitle,
}: {
  titleLines?: string[];
  subtitle?: string;
}) {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const tasteQuizPanel = useOptionalTasteQuizPanel();
  const reduceMotion = useReducedMotion();

  const resolvedTitleLines =
    titleLines && titleLines.length > 0
      ? titleLines
      : [t("home.heroTitleBefore"), t("home.heroTitleMiddle")].filter(Boolean);
  const resolvedSubtitle = subtitle?.trim() || t("home.heroSubtitle");

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-col",
        // Mobile overlay: sit near top under the fixed header, like the reference
        "justify-start pt-2",
        // Desktop: left column, vertically centered on light bg
        "md:order-1 md:justify-center md:py-10",
      )}
    >
      <motion.div
        className="flex w-full max-w-lg min-w-0 flex-col gap-5 md:gap-6"
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
              // Mobile: light type over the photo
              "text-[1.75rem] leading-[1.08] text-white drop-shadow-sm",
              // Desktop: original dark type
              "md:text-4xl md:leading-[0.95] md:tracking-tight md:text-foreground md:drop-shadow-none lg:text-5xl",
            )}
          >
            {resolvedTitleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </h1>
          {resolvedSubtitle ? (
            <p
              className={cn(
                "mt-3 max-w-md text-pretty text-[0.95rem] leading-relaxed md:mt-4 md:text-base",
                "text-white/90 md:text-stone-600",
              )}
            >
              {resolvedSubtitle}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transition}
          className="flex w-full min-w-0 flex-row gap-2.5 sm:gap-3"
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
          {tasteQuizPanel ? (
            <button
              type="button"
              onClick={tasteQuizPanel.openTasteQuiz}
              className={cn(
                heroButtonBaseClassName,
                "border border-white/80 bg-transparent text-white hover:bg-white/10",
                "md:border-stone-300 md:bg-white md:text-stone-900 md:hover:border-stone-400 md:hover:bg-stone-50",
              )}
            >
              {t("tasteQuiz.intro.title")}
            </button>
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
}
