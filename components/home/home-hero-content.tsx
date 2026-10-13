"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

import { useOptionalTasteQuizPanel } from "./home-taste-quiz-panel";

const heroButtonBaseClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-medium transition-colors sm:w-auto sm:min-w-[10rem]";

const heroButtonPrimaryClassName = cn(
  heroButtonBaseClassName,
  "bg-stone-900 text-white hover:bg-stone-800",
);

const heroButtonSecondaryClassName = cn(
  heroButtonBaseClassName,
  "border border-stone-300 bg-white text-stone-900 hover:border-stone-400 hover:bg-stone-50",
);

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
    <div className="order-2 flex min-h-0 min-w-0 flex-col justify-start py-1 md:order-1 md:justify-center md:py-10">
      <motion.div
        className="flex w-full max-w-lg min-w-0 flex-col gap-4 md:gap-6"
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
          <h1 className="max-w-full text-balance break-words text-[1.55rem] font-semibold uppercase leading-[1.08] tracking-[-0.02em] text-foreground sm:text-4xl sm:leading-[0.95] sm:tracking-tight lg:text-5xl">
            {resolvedTitleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </h1>
          {resolvedSubtitle ? (
            <p className="mt-3 max-w-md text-pretty text-[0.95rem] leading-relaxed text-stone-600 md:mt-4 md:text-base">
              {resolvedSubtitle}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transition}
          className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3"
        >
          <Link href={paths.shop} className={heroButtonPrimaryClassName}>
            {t("nav.shopAll")}
          </Link>
          {tasteQuizPanel ? (
            <button
              type="button"
              onClick={tasteQuizPanel.openTasteQuiz}
              className={heroButtonSecondaryClassName}
            >
              {t("tasteQuiz.intro.title")}
            </button>
          ) : null}
        </motion.div>
      </motion.div>
    </div>
  );
}
