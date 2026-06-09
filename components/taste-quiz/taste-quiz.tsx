"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/hooks/use-translations";
import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import {
  buildAnswerSummary,
  buildTasteQuizQuestions,
  isTasteQuizQuestionAnswered,
  type TasteQuizQuestion,
} from "@/lib/taste-quiz/questions";
import { rankWinesForAnswers } from "@/lib/taste-quiz/scoring";
import {
  hasCompleteTasteQuizAnswers,
  type TasteQuizAnswerKey,
  type TasteQuizAnswers,
} from "@/lib/taste-quiz/taste-profile";
import { TasteQuizResults } from "@/components/taste-quiz/taste-quiz-results";
import { cn } from "@/lib/utils";

export type { TasteQuizWine };

type Screen = "intro" | "quiz" | "result";

type SaveState = "idle" | "loading" | "saved" | "skipped";

interface TasteQuizProps {
  wines: TasteQuizWine[];
  embedded?: boolean;
}

export function TasteQuiz({ wines, embedded = false }: TasteQuizProps) {
  const { t } = useTranslations();
  const questions = useMemo(() => buildTasteQuizQuestions(t), [t]);
  const [screen, setScreen] = useState<Screen>(embedded ? "quiz" : "intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TasteQuizAnswers>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const currentQuestion = questions[step];

  const rankedWines = useMemo(() => {
    if (!hasCompleteTasteQuizAnswers(answers)) return [];
    return rankWinesForAnswers(wines, answers, t);
  }, [wines, answers, t]);

  const answerSummary = useMemo(
    () => buildAnswerSummary(questions, answers),
    [questions, answers],
  );

  const setAnswer = (key: TasteQuizAnswerKey, value: string | number) => {
    const normalizedValue =
      key === "adventure" && typeof value === "string"
        ? parseInt(value, 10)
        : value;
    setAnswers((prev) => ({ ...prev, [key]: normalizedValue }));
  };

  const handleRestart = () => {
    setScreen(embedded ? "quiz" : "intro");
    setStep(0);
    setAnswers({});
    setSaveState("idle");
  };

  const saveProfile = async () => {
    if (!hasCompleteTasteQuizAnswers(answers)) return;

    setSaveState("loading");
    try {
      const res = await fetch("/api/taste-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occasion: answers.occasion,
          style: answers.style,
          color: answers.color,
          adventure: answers.adventure,
          budget: answers.budget,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
      toast.success(t("tasteQuiz.toast.saved"));
    } catch {
      setSaveState("idle");
      toast.error(t("tasteQuiz.toast.error"));
    }
  };

  const handleNext = () => {
    if (!isTasteQuizQuestionAnswered(currentQuestion, answers)) return;

    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (hasCompleteTasteQuizAnswers(answers)) {
      setScreen("result");
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  if (screen === "intro") {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
            {t("tasteQuiz.intro.title")}
          </h1>
          <p className="text-base leading-relaxed text-stone-600">
            {t("tasteQuiz.intro.description")}
          </p>
        </div>
        <Button
          type="button"
          className="min-h-[44px] w-full bg-stone-900 text-white hover:bg-stone-800 sm:w-auto"
          onClick={() => setScreen("quiz")}
        >
          {t("tasteQuiz.intro.start")}
        </Button>
      </div>
    );
  }

  if (screen === "quiz") {
    return (
      <QuizStep
        currentQuestion={currentQuestion}
        step={step}
        totalSteps={questions.length}
        answers={answers}
        onAnswer={setAnswer}
        onBack={handleBack}
        onNext={handleNext}
        t={t}
      />
    );
  }

  return (
    <TasteQuizResults
      rankedWines={rankedWines}
      answerSummary={answerSummary}
      saveState={saveState}
      showSavePrompt
      showRestart
      onSave={() => void saveProfile()}
      onSkipSave={() => setSaveState("skipped")}
      onRestart={handleRestart}
    />
  );
}

function QuizStep({
  currentQuestion,
  step,
  totalSteps,
  answers,
  onAnswer,
  onBack,
  onNext,
  t,
}: {
  currentQuestion: TasteQuizQuestion;
  step: number;
  totalSteps: number;
  answers: TasteQuizAnswers;
  onAnswer: (key: TasteQuizAnswerKey, value: string | number) => void;
  onBack: () => void;
  onNext: () => void;
  t: (key: string) => string;
}) {
  const progress = ((step + 1) / totalSteps) * 100;
  const progressWidthClass =
    (["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const)[step] ?? "w-full";
  const canProceed = isTasteQuizQuestionAnswered(currentQuestion, answers);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-stone-500">
          <span>
            {currentQuestion.label} · {step + 1}/{totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div
            className={cn(
              "h-full rounded-full bg-stone-900 transition-all duration-300",
              progressWidthClass,
            )}
          />
        </div>
      </div>

      <div className="md:grid md:grid-cols-2 md:items-stretch md:gap-10 lg:gap-12">
        <div className="mb-5 flex flex-col justify-center md:mb-0 md:py-6 md:pr-6 lg:py-8 lg:pr-8">
          <h2 className="text-xl font-semibold tracking-tight text-stone-900 md:text-3xl md:leading-[1.08] lg:text-4xl xl:text-5xl xl:leading-[1.05]">
            {currentQuestion.title}
          </h2>
          {currentQuestion.sub ? (
            <p className="mt-3 text-sm text-stone-500 md:mt-4 md:text-base lg:text-lg">
              {currentQuestion.sub}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
            {currentQuestion.options.map((option) => {
              const selected =
                currentQuestion.id === "adventure"
                  ? String(answers[currentQuestion.id]) === option.val
                  : answers[currentQuestion.id] === option.val;
              return (
                <button
                  key={option.val}
                  type="button"
                  onClick={() => onAnswer(currentQuestion.id, option.val)}
                  className={cn(
                    "min-h-[44px] rounded-lg border p-4 text-left transition-colors",
                    selected
                      ? "border-stone-900 bg-stone-50 ring-1 ring-stone-900"
                      : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/80",
                  )}
                >
                  <p className="font-medium text-stone-900">{option.label}</p>
                  <p className="mt-1 text-sm text-stone-500">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="min-h-[44px] border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
          onClick={onBack}
          disabled={step === 0}
        >
          {t("tasteQuiz.nav.back")}
        </Button>
        <Button
          type="button"
          className="min-h-[44px] bg-stone-900 text-white hover:bg-stone-800"
          onClick={onNext}
          disabled={!canProceed}
        >
          {step === totalSteps - 1
            ? t("tasteQuiz.nav.seeResults")
            : t("tasteQuiz.nav.next")}
        </Button>
      </div>
    </div>
  );
}
