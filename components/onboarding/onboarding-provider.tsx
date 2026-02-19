"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface OnboardingContextType {
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

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hasChecked, setHasChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only check once when component mounts
    if (hasChecked) return;

    // Don't show on auth pages, invite pages, or tasting pages (guests can access)
    const isAuthPage =
      pathname?.startsWith("/log-in") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/access-request") ||
      pathname?.startsWith("/access-pending") ||
      pathname?.startsWith("/i/") || pathname?.startsWith("/ib/") || pathname?.startsWith("/b/") || pathname?.startsWith("/p/") ||
      pathname?.startsWith("/c/") ||
      pathname?.startsWith("/invite-signup") ||
      pathname?.startsWith("/code-signup") ||
      pathname?.startsWith("/onboarding") ||
      pathname?.startsWith("/tasting/");

    if (isAuthPage) {
      setHasChecked(true);
      return;
    }

    // Check if user has seen the welcome modal from database
    const checkOnboardingStatus = async () => {
      try {
        console.log("🎓 [Onboarding] Checking onboarding status...");
        const response = await fetch("/api/user/onboarding-seen");
        console.log("🎓 [Onboarding] Response status:", response.status);

        if (response.ok) {
          const data = await response.json();
          console.log("🎓 [Onboarding] Data:", data);
          // No automatic redirect to /onboarding on first visit – user can open it via onboarding button if desired
        } else {
          // If 401 (Unauthorized), user is a guest - silently skip onboarding
          if (response.status === 401) {
            console.log("🎓 [Onboarding] User is a guest (401), skipping onboarding check");
            return;
          }
          console.error("🎓 [Onboarding] Response not OK:", response.status);
          // Try to get error details
          try {
            const errorData = await response.json();
            console.error("🎓 [Onboarding] Error details:", errorData);
          } catch (e) {
            console.error("🎓 [Onboarding] Could not parse error response");
          }
        }
      } catch (error) {
        console.error(
          "🎓 [Onboarding] Error checking onboarding status:",
          error,
        );
      } finally {
        setHasChecked(true);
      }
    };

    checkOnboardingStatus();
  }, [pathname, hasChecked, router]);

  const showWelcome = () => {
    router.push("/onboarding");
  };

  const hideWelcome = async () => {
    // Mark as seen in database
    try {
      await fetch("/api/user/onboarding-seen", {
        method: "POST",
      });
    } catch (error) {
      console.error("Error marking onboarding as seen:", error);
    }
  };

  return (
    <OnboardingContext.Provider value={{ showWelcome, hideWelcome }}>
      {children}
    </OnboardingContext.Provider>
  );
}
