"use client";

import Link from "next/link";

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

export function HomeHeroContent() {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const tasteQuizPanel = useOptionalTasteQuizPanel();

  return (
    <div className="order-2 flex min-h-0 flex-col justify-center px-6 py-6 sm:px-8 md:order-1 md:px-10 md:py-10">
      <div className="pointer-events-auto flex max-w-lg flex-col gap-5 md:gap-6">
        <div>
          <h1 className="text-balance text-3xl font-semibold uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            <span className="block">{t("home.heroTitleBefore")}</span>
            <span className="block">{t("home.heroTitleMiddle")}</span>
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-stone-600 md:mt-4">
            {t("home.heroSubtitle")}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
        </div>
      </div>
    </div>
  );
}
