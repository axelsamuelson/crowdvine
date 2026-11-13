"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";

export interface OnboardingContextType {
  showWelcome: () => void;
  hideWelcome: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

/** Same as {@link useOnboarding} but returns undefined outside {@link OnboardingProvider} (no throw). */
export function useOnboardingOptional():
  | OnboardingContextType
  | undefined {
  return useContext(OnboardingContext);
}

/**
 * Context kept for API compatibility. showWelcome previously pushed `/onboarding`
 * (Opus template); that route now permanently redirects home. WelcomeModal is
 * intentionally not mounted — a separate product decision.
 */
export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const showWelcome = useCallback(() => {
    // no-op: retired Opus /onboarding route; do not navigate there
  }, []);

  const hideWelcome = useCallback(() => {
    // no-op: onboarding_seen UI flow retired with /onboarding
  }, []);

  const value = useMemo(
    () => ({ showWelcome, hideWelcome }),
    [showWelcome, hideWelcome],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}
