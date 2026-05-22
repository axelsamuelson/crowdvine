"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslations } from "@/lib/hooks/use-translations";

export function HomeLatestDropBadge() {
  const { t } = useTranslations();
  return (
    <Badge variant="outline-secondary">{t("home.latestDrop")}</Badge>
  );
}
