"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import type { AppLocale } from "@/lib/i18n/locale";
import type { WelcomeModalMembershipLevel } from "@/lib/onboarding/welcome-modal-membership";

const TIERS: WelcomeModalMembershipLevel[] = [
  "basic",
  "brons",
  "silver",
  "guld",
  "privilege",
  "founding_member",
];

export function WelcomeModalPreviewClient() {
  const params = useSearchParams();
  const locale = (params.get("locale") === "sv" ? "sv" : "en") as AppLocale;
  const tierRaw = params.get("tier") ?? "basic";
  const tier = (
    TIERS.includes(tierRaw as WelcomeModalMembershipLevel) ? tierRaw : "basic"
  ) as WelcomeModalMembershipLevel;
  const earning = params.get("earning") !== "0";
  const theme = params.get("theme") === "dark" ? "dark" : "light";
  const direct =
    params.get("direct") === "1" || params.get("direct") === "true";

  const stepIdParam = params.get("stepId");
  const stepParam = params.get("step");
  let initialStep = 0;
  if (stepIdParam != null) {
    const id = Number(stepIdParam);
    initialStep = Math.min(2, Math.max(0, (Number.isFinite(id) ? id : 1) - 1));
  } else if (stepParam != null) {
    initialStep = Math.min(2, Math.max(0, Number(stepParam) || 0));
  }

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    if (theme === "dark") {
      root.style.setProperty("--background", "0 0% 9%");
      root.style.setProperty("--foreground", "0 0% 98%");
      root.style.setProperty("--card", "0 0% 9%");
      root.style.setProperty("--card-foreground", "0 0% 98%");
      root.style.setProperty("--popover", "0 0% 9%");
      root.style.setProperty("--popover-foreground", "0 0% 98%");
      root.style.setProperty("--primary", "0 0% 98%");
      root.style.setProperty("--primary-foreground", "0 0% 12%");
      root.style.setProperty("--secondary", "0 0% 16%");
      root.style.setProperty("--secondary-foreground", "0 0% 98%");
      root.style.setProperty("--muted", "0 0% 16%");
      root.style.setProperty("--muted-foreground", "0 0% 70%");
      root.style.setProperty("--accent", "0 0% 16%");
      root.style.setProperty("--accent-foreground", "0 0% 98%");
      root.style.setProperty("--border", "0 0% 20%");
      root.style.setProperty("--input", "0 0% 20%");
      root.style.setProperty("--ring", "0 0% 60%");
    } else {
      [
        "--background",
        "--foreground",
        "--card",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--accent",
        "--accent-foreground",
        "--border",
        "--input",
        "--ring",
      ].forEach((prop) => root.style.removeProperty(prop));
    }
    return () => {
      root.classList.remove("dark");
      [
        "--background",
        "--foreground",
        "--card",
        "--card-foreground",
        "--popover",
        "--popover-foreground",
        "--primary",
        "--primary-foreground",
        "--secondary",
        "--secondary-foreground",
        "--muted",
        "--muted-foreground",
        "--accent",
        "--accent-foreground",
        "--border",
        "--input",
        "--ring",
      ].forEach((prop) => root.style.removeProperty(prop));
    };
  }, [theme]);

  const previewKey = [
    locale,
    theme,
    initialStep,
    tier,
    earning ? "earn" : "noearn",
    direct ? "direct" : "nodirect",
  ].join("-");

  return (
    <div className="min-h-screen bg-background">
      <WelcomeModal
        key={previewKey}
        isOpen
        onClose={() => undefined}
        locale={locale}
        initialStep={initialStep}
        previewMembershipLevel={tier}
        previewEarningEnabled={earning}
        previewMode
        directBoxCheckoutEnabled={direct}
      />
    </div>
  );
}
