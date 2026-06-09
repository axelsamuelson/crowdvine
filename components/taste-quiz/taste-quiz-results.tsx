"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import type { TasteQuizAnswerKey } from "@/lib/taste-quiz/taste-profile";
import type { RankedQuizWine } from "@/lib/taste-quiz/scoring";
import { wineColorDotClass } from "@/lib/wine-color";
import { cn } from "@/lib/utils";

export const HIDDEN_DISPLAY_TAGS = new Set([
  "gateway_natural",
  "classic",
  "everyday",
]);

function wineProductHref(wine: TasteQuizWine): string {
  if (wine.handle) return `/product/${wine.handle}`;
  return `/vin?search=${encodeURIComponent(wine.name)}`;
}

type SaveState = "idle" | "loading" | "saved" | "skipped";

interface TasteQuizResultsProps {
  rankedWines: RankedQuizWine[];
  answerSummary: { id: TasteQuizAnswerKey; label: string; value: string }[];
  saveState?: SaveState;
  onSave?: () => void;
  onSkipSave?: () => void;
  onRestart?: () => void;
  showSavePrompt?: boolean;
  showRestart?: boolean;
}

export function TasteQuizResults({
  rankedWines,
  answerSummary,
  saveState,
  onSave,
  onSkipSave,
  onRestart,
  showSavePrompt = false,
  showRestart = false,
}: TasteQuizResultsProps) {
  const { t } = useTranslations();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">
          {t("tasteQuiz.results.title")}
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          {t("tasteQuiz.results.subtitle")}
        </p>
      </div>

      {answerSummary.length > 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-stone-900">
            {t("tasteQuiz.results.summaryTitle")}
          </h3>
          <dl className="mt-3 divide-y divide-stone-100">
            {answerSummary.map(({ id, label, value }) => (
              <div
                key={id}
                className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <dt className="text-stone-500">{label}</dt>
                <dd className="text-right font-medium text-stone-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <ul className="space-y-4">
        {rankedWines.map(({ wine, matchPercent, reason }, index) => {
          const visibleTags = wine.tags.filter(
            (tag) => !HIDDEN_DISPLAY_TAGS.has(tag),
          );
          return (
            <li key={wine.id}>
              <Link
                href={wineProductHref(wine)}
                className="block rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-colors hover:border-stone-300 hover:bg-stone-50/80"
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100">
                    <Image
                      src={wine.imageUrl || DEFAULT_WINE_IMAGE_PATH}
                      alt={wine.name}
                      fill
                      className="object-cover"
                      sizes="72px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2.5 w-2.5 shrink-0 rounded-full",
                              wineColorDotClass(wine.color),
                            )}
                            aria-hidden
                          />
                          <p className="font-medium text-stone-900">
                            {index + 1}. {wine.name}
                          </p>
                        </div>
                        <p className="mt-0.5 text-sm text-stone-500">
                          {wine.producer}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm">
                        <p className="font-medium text-stone-900">
                          {t("tasteQuiz.results.priceKr", { price: wine.price })}
                        </p>
                        <p className="text-stone-500">
                          {t("tasteQuiz.results.match", {
                            percent: matchPercent,
                          })}
                        </p>
                      </div>
                    </div>
                    {visibleTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {visibleTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600"
                          >
                            {tag.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <p className="text-sm leading-snug text-stone-600">
                      {reason}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {rankedWines.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600">
          {t("tasteQuiz.results.noResults")}
        </p>
      ) : null}

      {showSavePrompt && saveState === "saved" ? (
        <div className="border-t border-stone-200 pt-5">
          <p className="text-sm text-stone-600">
            {t("tasteQuiz.results.profileSaved")}
          </p>
        </div>
      ) : showSavePrompt &&
        (saveState === "idle" || saveState === "loading") ? (
        <div className="space-y-3 border-t border-stone-200 pt-5">
          <div>
            <p className="text-sm font-medium text-stone-900">
              {t("tasteQuiz.results.saveTitle")}
            </p>
            <p className="mt-0.5 text-sm text-stone-500">
              {t("tasteQuiz.results.saveDescription")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="min-h-[44px] bg-stone-900 text-white hover:bg-stone-800"
              disabled={saveState === "loading"}
              onClick={onSave}
            >
              {saveState === "loading"
                ? t("tasteQuiz.results.saving")
                : t("tasteQuiz.results.saveButton")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
              onClick={onSkipSave}
            >
              {t("tasteQuiz.results.skip")}
            </Button>
          </div>
        </div>
      ) : null}

      {showRestart && onRestart ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] w-full border-stone-200 bg-white text-stone-900 hover:bg-stone-50 sm:w-auto"
          onClick={onRestart}
        >
          {t("tasteQuiz.nav.restart")}
        </Button>
      ) : null}
    </div>
  );
}
