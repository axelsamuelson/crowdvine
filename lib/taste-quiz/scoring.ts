import type { TasteQuizWine } from "@/lib/taste-quiz/get-quiz-wines";
import type { TasteQuizAnswers } from "@/lib/taste-quiz/taste-profile";

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

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

function tagHits(wineTags: string[], candidates: readonly string[]): number {
  const normalized = new Set(wineTags.map((tag) => tag.toLowerCase()));
  return candidates.filter((tag) => normalized.has(tag.toLowerCase())).length;
}

export function adventureScaleDiff(
  wine: TasteQuizWine,
  adventure: number,
): number {
  return Math.abs(wine.style_scale - adventure);
}

function scoreAdventure(wine: TasteQuizWine, adventure: number): number {
  const diff = adventureScaleDiff(wine, adventure);
  let score = 10 * (1 - diff / 4);

  const tags = new Set(wine.tags.map((tag) => tag.toLowerCase()));

  if (adventure <= 2) {
    if (tags.has("funky_wild")) score -= 8;
    if (tags.has("out_of_the_ordinary")) score -= 4;
    if (wine.style_scale <= 2) score += 4;
  }

  if (adventure >= 4) {
    if (tags.has("funky_wild")) score += 6;
    if (wine.style_scale >= 4) score += 4;
  }

  if (adventure >= 4 && wine.style_scale <= 2) {
    score -= 6;
  }

  if (diff >= 3) {
    score -= 12;
  }

  return score;
}

export function scoreWine(
  wine: TasteQuizWine,
  answers: TasteQuizAnswers,
): number {
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
    score += scoreAdventure(wine, adventure);
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
  answers: TasteQuizAnswers,
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

export type RankedQuizWine = {
  wine: TasteQuizWine;
  score: number;
  matchPercent: number;
  reason: string;
};

export function rankWinesForAnswers(
  wines: TasteQuizWine[],
  answers: TasteQuizAnswers,
  t: TranslateFn,
): RankedQuizWine[] {
  const scored = wines.map((wine) => ({
    wine,
    score: scoreWine(wine, answers),
  }));
  scored.sort((a, b) => b.score - a.score);

  const adventure = answers.adventure;
  let candidates = scored;
  if (typeof adventure === "number" && Number.isFinite(adventure)) {
    const aligned = scored.filter(
      ({ wine }) => adventureScaleDiff(wine, adventure) <= 2,
    );
    if (aligned.length >= 3) {
      candidates = aligned;
    } else {
      const relaxed = scored.filter(
        ({ wine }) => adventureScaleDiff(wine, adventure) <= 3,
      );
      if (relaxed.length > 0) {
        candidates = relaxed;
      }
    }
  }

  const maxScore = Math.max(1, candidates[0]?.score ?? 1);
  return candidates.slice(0, 5).map(({ wine, score }) => ({
    wine,
    score,
    matchPercent: Math.max(0, Math.round((score / maxScore) * 100)),
    reason: buildReason(wine, answers, t),
  }));
}
