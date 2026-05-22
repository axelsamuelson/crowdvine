"use client";

import { PricingSavingsSection } from "./sections/pricing-savings-section";
import { HowPactWorksSection } from "./sections/how-pact-works-section";
import { inviteStory } from "./invite-story-ui";
import { cn } from "@/lib/utils";

/** Pricing + How PACT as one visual chapter on the invite landing. */
export function PactStorySections() {
  return (
    <div className={inviteStory.outer}>
      <div className={inviteStory.container}>
        <div className={inviteStory.part}>
          <PricingSavingsSection />
        </div>
        <div className={cn(inviteStory.partDivider, inviteStory.part)}>
          <HowPactWorksSection />
        </div>
      </div>
    </div>
  );
}
