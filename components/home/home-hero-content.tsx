"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

import { useOptionalTasteQuizPanel } from "./home-taste-quiz-panel";

const heroButtonBaseClassName =
  "inline-flex h-11 min-w-[10rem] items-center justify-center rounded-full px-6 text-sm font-medium transition-colors";

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
    <div className="order-2 flex min-h-0 flex-col justify-center py-6 md:order-1 md:py-10">
      <motion.div
        className="flex max-w-lg flex-col gap-5 md:gap-6"
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
        <motion.div variants={fadeUp} transition={transition}>
          <h1 className="text-balance text-3xl font-semibold uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {resolvedTitleLines.map((line, index) => (
              <span key={`${index}-${line}`} className="block">
                {line}
              </span>
            ))}
          </h1>
          {resolvedSubtitle ? (
            <p className="mt-3 max-w-md text-base leading-relaxed text-stone-600 md:mt-4">
              {resolvedSubtitle}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transition}
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        >
          {tasteQuizPanel ? (
            <button
              type="button"
              onClick={tasteQuizPanel.openTasteQuiz}
              className={heroButtonPrimaryClassName}
            >
              {t("tasteQuiz.intro.title")}
            </button>
          ) : null}
          <Link href={paths.shop} className={heroButtonSecondaryClassName}>
            {t("nav.shopAll")}
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
