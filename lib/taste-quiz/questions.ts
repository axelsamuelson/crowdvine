import type {
  TasteQuizAnswerKey,
  TasteQuizAnswers,
} from "@/lib/taste-quiz/taste-profile";
import { hasCompleteTasteQuizAnswers } from "@/lib/taste-quiz/taste-profile";
import type { TranslateFn } from "@/lib/taste-quiz/scoring";

type GridOption = { val: string; label: string; desc: string };

export type TasteQuizQuestion = {
  id: TasteQuizAnswerKey;
  label: string;
  title: string;
  sub?: string;
  type: "grid";
  options: GridOption[];
};

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
    type: "grid" as const,
    options: ["1", "2", "3", "4", "5"] as const,
  },
  {
    id: "budget" as const,
    type: "grid" as const,
    options: ["low", "mid", "high"] as const,
  },
] as const;

export function buildTasteQuizQuestions(t: TranslateFn): TasteQuizQuestion[] {
  return QUESTION_DEFS.map((def) => {
    const base = `tasteQuiz.questions.${def.id}`;
    return {
      id: def.id,
      type: "grid" as const,
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

export function buildAnswerSummary(
  questions: TasteQuizQuestion[],
  answers: TasteQuizAnswers,
): { id: TasteQuizAnswerKey; label: string; value: string }[] {
  if (!hasCompleteTasteQuizAnswers(answers)) return [];

  return questions.map((question) => {
    const selected = answers[question.id];
    const option = question.options.find(
      (entry) =>
        entry.val === selected ||
        (question.id === "adventure" && String(selected) === entry.val),
    );
    return {
      id: question.id,
      label: question.label,
      value: option?.label ?? String(selected ?? ""),
    };
  });
}

export function isTasteQuizQuestionAnswered(
  question: TasteQuizQuestion,
  answers: TasteQuizAnswers,
): boolean {
  const value = answers[question.id];
  if (question.id === "adventure") {
    return typeof value === "number" && value >= 1 && value <= 5;
  }
  return typeof value === "string" && value.length > 0;
}
