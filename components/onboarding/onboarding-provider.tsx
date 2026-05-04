"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { usePathname, useRouter } from "next/navigation";

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

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    const isAuthPage =
      pathname?.startsWith("/log-in") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/access-request") ||
      pathname?.startsWith("/access-pending") ||
      pathname?.startsWith("/i/") ||
      pathname?.startsWith("/ib/") ||
      pathname?.startsWith("/b/") ||
      pathname?.startsWith("/p/") ||
      pathname?.startsWith("/c/") ||
      pathname?.startsWith("/invite-signup") ||
      pathname?.startsWith("/code-signup") ||
      pathname?.startsWith("/onboarding") ||
      pathname?.startsWith("/tasting/");

    if (isAuthPage) {
      return;
    }

    const controller = new AbortController();

    const checkOnboardingStatus = async () => {
      try {
        console.log("🎓 [Onboarding] Checking onboarding status...");
        const response = await fetch("/api/user/onboarding-seen", {
          signal: controller.signal,
        });
        console.log("🎓 [Onboarding] Response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("🎓 [Onboarding] Data:", data);
        } else {
          if (response.status === 401) {
            console.log(
              "🎓 [Onboarding] User is a guest (401), skipping onboarding check",
            );
            return;
          }
          console.error("🎓 [Onboarding] Response not OK:", response.status);
          try {
            const errorData = await response.json();
            console.error("🎓 [Onboarding] Error details:", errorData);
          } catch {
            console.error("🎓 [Onboarding] Could not parse error response");
          }
        }
      } catch (error: unknown) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error(
          "🎓 [Onboarding] Error checking onboarding status:",
          error,
        );
      }
    };

    void checkOnboardingStatus();
    return () => controller.abort();
  }, [pathname]);

  const showWelcome = useCallback(() => {
    routerRef.current.push("/onboarding");
  }, []);

  const hideWelcome = useCallback(async () => {
    try {
      await fetch("/api/user/onboarding-seen", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error marking onboarding as seen:", error);
    }
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
