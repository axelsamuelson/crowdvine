"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import {
  buildAnswerSummary,
  buildTasteQuizQuestions,
} from "@/lib/taste-quiz/questions";
import { rankWinesForAnswers } from "@/lib/taste-quiz/scoring";
import {
  savedProfileToAnswers,
  type SavedTasteProfile,
} from "@/lib/taste-quiz/taste-profile";
import { TasteQuizResults } from "@/components/taste-quiz/taste-quiz-results";

interface SavedTasteProfileViewProps {
  wines: TasteQuizWine[];
}

export function SavedTasteProfileView({ wines }: SavedTasteProfileViewProps) {
  const { t, context: shopping } = useTranslations();
  const intlLocale = shopping.intlLocale;
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SavedTasteProfile | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("/api/taste-profile");
        if (res.status === 401) {
          setUnauthorized(true);
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to load taste profile");
        }
        setProfile(json.profile ?? null);
        setUpdatedAt(json.updatedAt ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load taste profile",
        );
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const questions = useMemo(() => buildTasteQuizQuestions(t), [t]);
  const answers = useMemo(
    () => (profile ? savedProfileToAnswers(profile) : {}),
    [profile],
  );
  const answerSummary = useMemo(
    () => buildAnswerSummary(questions, answers),
    [questions, answers],
  );
  const rankedWines = useMemo(
    () => (profile ? rankWinesForAnswers(wines, answers, t) : []),
    [wines, answers, t, profile],
  );

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleDateString(intlLocale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-stone-900" />
      </div>
    );
  }

  if (unauthorized) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8 text-center md:px-sides">
        <h1 className="text-2xl font-semibold text-stone-900">
          {t("profile.tasteProfile.signInTitle")}
        </h1>
        <p className="text-sm text-stone-600">
          {t("profile.tasteProfile.signInSubtitle")}
        </p>
        <Button asChild className="rounded-full">
          <Link href="/log-in">{t("profile.goToLogin")}</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 md:px-sides">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:px-sides md:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-stone-600 hover:bg-transparent hover:text-stone-900"
            asChild
          >
            <Link href="/profile" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("profile.tasteProfile.backToProfile")}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Wine className="h-5 w-5 text-stone-500" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              {t("profile.tasteProfile.title")}
            </h1>
          </div>
          {updatedLabel ? (
            <p className="text-sm text-stone-500">
              {t("profile.tasteProfile.updatedAt", { date: updatedLabel })}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          className="shrink-0 border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
          asChild
        >
          <Link href="/#taste-quiz">{t("profile.tasteProfile.retakeQuiz")}</Link>
        </Button>
      </div>

      {!profile ? (
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-stone-900">
            {t("profile.tasteProfile.emptyTitle")}
          </h2>
          <p className="text-sm leading-relaxed text-stone-600">
            {t("profile.tasteProfile.emptyDescription")}
          </p>
          <Button
            className="min-h-[44px] bg-stone-900 text-white hover:bg-stone-800"
            asChild
          >
            <Link href="/#taste-quiz">{t("profile.tasteProfile.startQuiz")}</Link>
          </Button>
        </div>
      ) : (
        <TasteQuizResults
          rankedWines={rankedWines}
          answerSummary={answerSummary}
        />
      )}
    </div>
  );
}
