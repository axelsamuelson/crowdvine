export type TasteQuizAnswerKey =
  | "occasion"
  | "style"
  | "color"
  | "adventure"
  | "budget";

export type TasteQuizAnswers = Partial<
  Record<TasteQuizAnswerKey, string | number>
>;

export type SavedTasteProfile = {
  occasion: string;
  style: string;
  color: string;
  adventure: number;
  budget: string;
  saved_at: string;
};

export function savedProfileToAnswers(
  profile: SavedTasteProfile,
): TasteQuizAnswers {
  return {
    occasion: profile.occasion,
    style: profile.style,
    color: profile.color,
    adventure: profile.adventure,
    budget: profile.budget,
  };
}

export function hasCompleteTasteQuizAnswers(
  answers: TasteQuizAnswers,
): answers is Required<
  Record<TasteQuizAnswerKey, string | number>
> & { adventure: number } {
  return (
    typeof answers.occasion === "string" &&
    typeof answers.style === "string" &&
    typeof answers.color === "string" &&
    typeof answers.adventure === "number" &&
    typeof answers.budget === "string"
  );
}
