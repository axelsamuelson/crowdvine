"use client";

import { useMemo } from "react";

import { localizedPathsForLocale } from "@/lib/i18n/localized-paths";
import { useTranslations } from "@/lib/hooks/use-translations";

export function useLocalizedPaths() {
  const { context } = useTranslations();
  return useMemo(
    () => localizedPathsForLocale(context.locale),
    [context.locale],
  );
}
