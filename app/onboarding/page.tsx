"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LenisProvider } from "@/components/onboarding/opus/lenis-provider";
import { CustomCursor } from "@/components/onboarding/opus/custom-cursor";
import { HeroSection } from "@/components/onboarding/opus/sections/hero-section";
import { ManifestoSection } from "@/components/onboarding/opus/sections/manifesto-section";
import { FeaturesSection } from "@/components/onboarding/opus/sections/features-section";
import { ShowcaseSection } from "@/components/onboarding/opus/sections/showcase-section";
import { CarouselSection } from "@/components/onboarding/opus/sections/carousel-section";
import { InsightsSection } from "@/components/onboarding/opus/sections/insights-section";
import { PricingSection } from "@/components/onboarding/opus/sections/pricing-section";
import { FooterSection } from "@/components/onboarding/opus/sections/footer-section";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const continueToApp = async () => {
    try {
      setBusy(true);
      await fetch("/api/user/onboarding-seen", { method: "POST" }).catch(() => null);
    } finally {
      setBusy(false);
      router.push("/shop");
    }
  };

  return (
    <LenisProvider>
      <main className="custom-cursor bg-background">
        <CustomCursor />

        <div className="fixed top-4 right-4 z-[50]">
          <Button
            type="button"
            onClick={continueToApp}
            disabled={busy}
            className="rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {busy ? "Loading…" : "Continue"}
          </Button>
        </div>

        <HeroSection />
        <ManifestoSection />
        <FeaturesSection />
        <ShowcaseSection />
        <CarouselSection />
        <InsightsSection />
        <PricingSection />
        <FooterSection />
      </main>
    </LenisProvider>
  );
}


