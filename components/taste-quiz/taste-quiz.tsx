"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { useTranslations } from "@/lib/hooks/use-translations";
import { wineColorDotClass } from "@/lib/wine-color";
import { cn } from "@/lib/utils";

export type TasteQuizWine = {
  id: string;
  name: string;
  producer: string;
  handle: string | null;
  imageUrl: string;
  color: string;
  grapes: string[];
  soil: string;
  style_scale: number;
  price: number;
  tags: string[];
};

function wineProductHref(wine: TasteQuizWine): string {
  if (wine.handle) return `/product/${wine.handle}`;
  return `/shop?search=${encodeURIComponent(wine.name)}`;
}

type AnswerKey = "occasion" | "style" | "color" | "adventure" | "budget";

type Answers = Partial<Record<AnswerKey, string | number>>;

type Screen = "intro" | "quiz" | "result";

type SaveState = "idle" | "loading" | "saved" | "skipped";

type GridOption = { val: string; label: string; desc: string };

type GridQuestion = {
  id: AnswerKey;
  label: string;
  title: string;
  sub?: string;
  type: "grid";
  options: GridOption[];
};

type ScaleQuestion = {
  id: "adventure";
  label: string;
  title: string;
  sub?: string;
  type: "scale";
  left: string;
  right: string;
};

type Question = GridQuestion | ScaleQuestion;

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

const QUESTION_DEFS = [
  {
    id: "occasion" as const,
    type: "grid" as const,
    options: ["aperitif", "casual", "dinner", "special"] as const,
  },
  {
    id: "style" as const,
    type: "grid" as const,
    options: [
      "fresh_fruity",
      "mineral_dry",
      "rich_complex",
      "aromatic_floral",
    ] as const,
  },
  {
    id: "color" as const,
    type: "grid" as const,
    options: ["red", "white", "orange", "any"] as const,
  },
  {
    id: "adventure" as const,
    type: "scale" as const,
  },
  {
    id: "budget" as const,
    type: "grid" as const,
    options: ["low", "mid", "high"] as const,
  },
] as const;

function buildQuestions(t: TranslateFn): Question[] {
  return QUESTION_DEFS.map((def) => {
    const base = `tasteQuiz.questions.${def.id}`;
    if (def.type === "scale") {
      return {
        id: def.id,
        type: "scale",
        label: t(`${base}.label`),
        title: t(`${base}.title`),
        sub: t(`${base}.sub`),
        left: t(`${base}.left`),
        right: t(`${base}.right`),
      };
    }

    return {
      id: def.id,
      type: "grid",
      label: t(`${base}.label`),
      title: t(`${base}.title`),
      options: def.options.map((val) => ({
        val,
        label: t(`${base}.options.${val}.label`),
        desc: t(`${base}.options.${val}.desc`),
      })),
    };
  });
}

const OCCASION_TAGS: Record<string, readonly string[]> = {
  aperitif: ["aperitif", "social_wine", "light_easy"],
  casual: ["social_wine", "everyday", "fruit_forward"],
  dinner: ["dinner_wine", "structured", "complex"],
  special: [
    "celebration",
    "collectors_item",
    "winemaker_signature",
    "out_of_the_ordinary",
  ],
};

const STYLE_TAGS: Record<string, readonly string[]> = {
  fresh_fruity: ["fruit_forward", "light_easy", "gateway_natural", "classic"],
  mineral_dry: ["mineral_driven", "terroir_showcase", "complex"],
  rich_complex: ["structured", "complex", "dinner_wine", "winemaker_signature"],
  aromatic_floral: ["fruit_forward", "out_of_the_ordinary", "social_wine"],
};

const SOIL_KEYWORDS: Record<string, readonly string[]> = {
  mineral_dry: ["skiffer", "kalksten", "kalkrik", "argilo-calcaire"],
  fresh_fruity: ["sandig", "galets", "lerjord"],
  rich_complex: ["skiffer", "argilo-calcaire", "marmor"],
};

const COLOR_ANSWER_TO_WINE: Record<string, string> = {
  red: "Red",
  white: "White",
  orange: "Orange",
};

const HIDDEN_DISPLAY_TAGS = new Set([
  "gateway_natural",
  "classic",
  "everyday",
]);

interface TasteQuizProps {
  wines: TasteQuizWine[];
}

function tagHits(wineTags: string[], candidates: readonly string[]): number {
  const normalized = new Set(wineTags.map((t) => t.toLowerCase()));
  return candidates.filter((t) => normalized.has(t.toLowerCase())).length;
}

export function scoreWine(wine: TasteQuizWine, answers: Answers): number {
  let score = 0;

  const occasion = answers.occasion;
  if (typeof occasion === "string") {
    const tags = OCCASION_TAGS[occasion] ?? [];
    score += tagHits(wine.tags, tags) * 3;
  }

  const style = answers.style;
  if (typeof style === "string") {
    const tags = STYLE_TAGS[style] ?? [];
    score += tagHits(wine.tags, tags) * 3;
  }

  const adventure = answers.adventure;
  if (typeof adventure === "number" && Number.isFinite(adventure)) {
    score += 4 * (1 - Math.abs(wine.style_scale - adventure) / 4);
  }

  const colorAnswer = answers.color;
  if (typeof colorAnswer === "string" && colorAnswer !== "any") {
    const expected = COLOR_ANSWER_TO_WINE[colorAnswer];
    if (
      expected &&
      wine.color.trim().toLowerCase() === expected.toLowerCase()
    ) {
      score += 5;
    } else {
      score -= 2;
    }
  }

  const budget = answers.budget;
  if (budget === "low") {
    score += wine.price < 150 ? 3 : -1;
  } else if (budget === "mid") {
    score += wine.price >= 140 && wine.price <= 210 ? 3 : -1;
  } else if (budget === "high") {
    score += wine.price >= 180 ? 3 : -1;
  }

  if (typeof style === "string") {
    const soilKeywords = SOIL_KEYWORDS[style] ?? [];
    const soilLower = wine.soil.toLowerCase();
    for (const keyword of soilKeywords) {
      if (soilLower.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }
  }

  return score;
}

export function buildReason(
  wine: TasteQuizWine,
  answers: Answers,
  t: TranslateFn,
): string {
  const phrases: string[] = [];
  const style = answers.style;
  const occasion = answers.occasion;
  const adventure = answers.adventure;
  const tags = new Set(wine.tags.map((tag) => tag.toLowerCase()));

  const push = (phrase: string) => {
    if (phrases.length < 2 && !phrases.includes(phrase)) {
      phrases.push(phrase);
    }
  };

  if (
    style === "mineral_dry" &&
    tags.has("mineral_driven") &&
    wine.soil.trim()
  ) {
    push(t("tasteQuiz.reasons.mineralSoil", { soil: wine.soil }));
  }
  if (style === "fresh_fruity" && tags.has("fruit_forward")) {
    push(t("tasteQuiz.reasons.freshFruity"));
  }
  if (occasion === "special" && tags.has("collectors_item")) {
    push(t("tasteQuiz.reasons.collectorsItem"));
  }
  if (
    typeof adventure === "number" &&
    adventure >= 4 &&
    tags.has("funky_wild")
  ) {
    push(t("tasteQuiz.reasons.funkyWild"));
  }
  if (
    typeof adventure === "number" &&
    adventure <= 2 &&
    wine.style_scale <= 2
  ) {
    push(t("tasteQuiz.reasons.classicStyle"));
  }
  if (tags.has("terroir_showcase")) {
    push(t("tasteQuiz.reasons.terroirShowcase", { producer: wine.producer }));
  }
  if (wine.grapes.length > 2) {
    push(t("tasteQuiz.reasons.unusualBlend", { count: wine.grapes.length }));
  }

  if (phrases.length === 0) {
    return t("tasteQuiz.reasons.fallback");
  }

  return phrases.slice(0, 2).join(" · ");
}

function isQuestionAnswered(question: Question, answers: Answers): boolean {
  const value = answers[question.id];
  if (question.type === "scale") {
    return typeof value === "number";
  }
  return typeof value === "string" && value.length > 0;
}

function hasCompleteAnswers(answers: Answers): answers is Required<
  Record<AnswerKey, string | number>
> & { adventure: number } {
  return (
    typeof answers.occasion === "string" &&
    typeof answers.style === "string" &&
    typeof answers.color === "string" &&
    typeof answers.adventure === "number" &&
    typeof answers.budget === "string"
  );
}

function buildAnswerSummary(
  questions: Question[],
  answers: Answers,
  t: TranslateFn,
): { id: AnswerKey; label: string; value: string }[] {
  if (!hasCompleteAnswers(answers)) return [];

  return questions.map((question) => {
    if (question.type === "grid") {
      const selected = answers[question.id];
      const option = question.options.find((o) => o.val === selected);
      return {
        id: question.id,
        label: question.label,
        value: option?.label ?? String(selected),
      };
    }

    const adventure = answers.adventure;
    return {
      id: question.id,
      label: question.label,
      value:
        typeof adventure === "number"
          ? t("tasteQuiz.results.adventureAnswer", {
              value: adventure,
              left: question.left,
              right: question.right,
            })
          : "",
    };
  });
}

export function TasteQuiz({ wines }: TasteQuizProps) {
  const { t } = useTranslations();
  const questions = useMemo(() => buildQuestions(t), [t]);
  const [screen, setScreen] = useState<Screen>("intro");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const currentQuestion = questions[step];

  const rankedWines = useMemo(() => {
    if (!hasCompleteAnswers(answers)) return [];
    const scored = wines.map((wine) => ({
      wine,
      score: scoreWine(wine, answers),
    }));
    scored.sort((a, b) => b.score - a.score);
    const maxScore = Math.max(1, scored[0]?.score ?? 1);
    return scored.slice(0, 5).map(({ wine, score }) => ({
      wine,
      score,
      matchPercent: Math.round((score / maxScore) * 100),
      reason: buildReason(wine, answers, t),
    }));
  }, [wines, answers, t]);

  const answerSummary = useMemo(
    () => buildAnswerSummary(questions, answers, t),
    [questions, answers, t],
  );

  const setAnswer = (key: AnswerKey, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleRestart = () => {
    setScreen("intro");
    setStep(0);
    setAnswers({});
    setSaveState("idle");
  };

  const saveProfile = async () => {
    if (!hasCompleteAnswers(answers)) return;

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
    if (!isQuestionAnswered(currentQuestion, answers)) return;

    if (step < questions.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    if (hasCompleteAnswers(answers)) {
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
    const progress = ((step + 1) / questions.length) * 100;
    const progressWidthClass =
      (["w-1/5", "w-2/5", "w-3/5", "w-4/5", "w-full"] as const)[step] ?? "w-full";
    const canProceed = isQuestionAnswered(currentQuestion, answers);

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-stone-500">
            <span>
              {currentQuestion.label} · {step + 1}/{questions.length}
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

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">
              {currentQuestion.title}
            </h2>
            {currentQuestion.sub ? (
              <p className="text-sm text-stone-500">{currentQuestion.sub}</p>
            ) : null}
          </div>

          {currentQuestion.type === "grid" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] === option.val;
                return (
                  <button
                    key={option.val}
                    type="button"
                    onClick={() => setAnswer(currentQuestion.id, option.val)}
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
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-stone-500">
                <span>{currentQuestion.left}</span>
                <span>{currentQuestion.right}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((value) => {
                  const selected = answers.adventure === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswer("adventure", value)}
                      className={cn(
                        "flex min-h-[44px] flex-col items-center justify-center rounded-lg border px-1 py-2 transition-colors",
                        selected
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-200 bg-white text-stone-900 hover:border-stone-300",
                      )}
                    >
                      <span className="text-lg font-semibold">{value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
            onClick={handleBack}
            disabled={step === 0}
          >
            {t("tasteQuiz.nav.back")}
          </Button>
          <Button
            type="button"
            className="min-h-[44px] bg-stone-900 text-white hover:bg-stone-800"
            onClick={handleNext}
            disabled={!canProceed}
          >
            {step === questions.length - 1
              ? t("tasteQuiz.nav.seeResults")
              : t("tasteQuiz.nav.next")}
          </Button>
        </div>
      </div>
    );
  }

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

      {saveState === "saved" ? (
        <div className="border-t border-stone-200 pt-5">
          <p className="text-sm text-stone-600">
            {t("tasteQuiz.results.profileSaved")}
          </p>
        </div>
      ) : saveState === "idle" || saveState === "loading" ? (
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
              onClick={() => void saveProfile()}
            >
              {saveState === "loading"
                ? t("tasteQuiz.results.saving")
                : t("tasteQuiz.results.saveButton")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] border-stone-200 bg-white text-stone-900 hover:bg-stone-50"
              onClick={() => setSaveState("skipped")}
            >
              {t("tasteQuiz.results.skip")}
            </Button>
          </div>
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="min-h-[44px] w-full border-stone-200 bg-white text-stone-900 hover:bg-stone-50 sm:w-auto"
        onClick={handleRestart}
      >
        {t("tasteQuiz.nav.restart")}
      </Button>
    </div>
  );
}
