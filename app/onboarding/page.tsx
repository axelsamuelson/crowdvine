import { permanentRedirect } from "next/navigation";

/**
 * Opus SaaS template was previously served here. Never show it to customers —
 * permanent redirect to home (also declared in next.config.mjs for both
 * `/onboarding` and `/en/onboarding`).
 */
export default function OnboardingPage() {
  permanentRedirect("/");
}
