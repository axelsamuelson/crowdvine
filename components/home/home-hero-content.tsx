"use client";

import Image from "next/image";
import Link from "next/link";

import { useLocalizedPaths } from "@/lib/hooks/use-localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";
import { cn } from "@/lib/utils";

import { useOptionalTasteQuizPanel } from "./home-taste-quiz-panel";

const titleClasses =
  "max-w-none text-center text-2xl font-medium leading-none tracking-tighter whitespace-nowrap text-white sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";

const heroButtonBaseClassName =
  "inline-flex h-10 w-full min-w-0 items-center justify-center rounded-sm px-3 text-center text-sm font-medium sm:px-4";

const heroButtonClassName = cn(
  heroButtonBaseClassName,
  "border border-white/35 bg-white/10 text-white backdrop-blur-md transition-colors hover:border-white/55 hover:bg-white/15",
);

const heroButtonPrimaryClassName = cn(
  heroButtonBaseClassName,
  "border border-white bg-white text-stone-900 transition-colors hover:bg-white/90",
);

function HeroFavicon() {
  return (
    <Image
      src="/favicon.png"
      alt=""
      aria-hidden
      width={18}
      height={18}
      className="h-[18px] w-[18px] brightness-0 invert sm:h-5 sm:w-5"
    />
  );
}

export function HomeHeroContent() {
  const { t } = useTranslations();
  const paths = useLocalizedPaths();
  const tasteQuizPanel = useOptionalTasteQuizPanel();
  const title = t("home.heroTitle");

  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55"
      />

      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-11">
        <div className="pointer-events-auto flex flex-col items-center gap-5 sm:gap-6">
          <h1 className={titleClasses}>{title}</h1>
          <div className="grid w-full max-w-xs grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:max-w-sm sm:gap-4">
            {tasteQuizPanel ? (
              <button
                type="button"
                onClick={tasteQuizPanel.openTasteQuiz}
                className={heroButtonPrimaryClassName}
              >
                {t("tasteQuiz.intro.title")}
              </button>
            ) : (
              <span aria-hidden />
            )}
            <HeroFavicon />
            <Link href={paths.shop} className={heroButtonClassName}>
              {t("nav.shopAll")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
