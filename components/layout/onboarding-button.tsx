"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useTranslations } from "@/lib/hooks/use-translations";

const onboardingButtonClassName = `
        h-8 px-3 
        text-background/70 hover:text-background 
        hover:bg-background/10 
        transition-all duration-200 
        rounded-full 
        border border-background/20 hover:border-background/40
        backdrop-blur-sm
        group
        font-medium text-xs tracking-wide
      `;

/**
 * Always render the same DOM as SSR and hydration (Link), so we never branch on
 * context that may be missing during the server pass. Navigation matches
 * OnboardingProvider.showWelcome (router.push("/onboarding")).
 */
export function OnboardingButton() {
  const { t } = useTranslations();

  return (
    <Button variant="ghost" size="sm" asChild className={onboardingButtonClassName}>
      <Link href="/onboarding" prefetch>
        <HelpCircle className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:scale-110" />
        <span className="max-md:hidden">{t("home.getStarted")}</span>
        <span className="md:hidden">{t("home.help")}</span>
      </Link>
    </Button>
  );
}
