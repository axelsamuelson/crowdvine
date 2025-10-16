"use client";

import { useOnboarding } from "@/components/onboarding/onboarding-provider";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingButton() {
  const { showWelcome } = useOnboarding();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={showWelcome}
      className="
        h-8 px-3 
        text-background/70 hover:text-background 
        hover:bg-background/10 
        transition-all duration-200 
        rounded-full 
        border border-background/20 hover:border-background/40
        backdrop-blur-sm
        group
        font-medium text-xs tracking-wide
      "
    >
      <HelpCircle className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover:scale-110" />
      <span className="max-md:hidden">Get Started</span>
      <span className="md:hidden">Help</span>
    </Button>
  );
}
