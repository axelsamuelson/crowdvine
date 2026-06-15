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
    let cancelled = false;

    const checkOnboardingStatus = async () => {
      if (cancelled || controller.signal.aborted) return;

      try {
        const response = await fetch("/api/user/onboarding-seen", {
          signal: controller.signal,
          credentials: "same-origin",
        });

        if (cancelled || controller.signal.aborted) return;

        if (response.ok) {
          await response.json();
          return;
        }

        if (response.status === 401) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[Onboarding] Unexpected status from onboarding-seen:",
            response.status,
          );
        }
      } catch (error: unknown) {
        if (cancelled || controller.signal.aborted) return;

        const isAbort =
          error instanceof DOMException
            ? error.name === "AbortError"
            : error instanceof Error && error.name === "AbortError";
        if (isAbort) return;

        // Navigation/redirect often aborts in-flight fetches in dev (shows as TypeError).
        if (
          error instanceof TypeError &&
          error.message === "Failed to fetch"
        ) {
          return;
        }

        console.error("[Onboarding] Error checking onboarding status:", error);
      }
    };

    const timeoutId = window.setTimeout(() => {
      void checkOnboardingStatus();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
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
