"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { WelcomeModal } from "./welcome-modal";
import { usePathname } from "next/navigation";

interface OnboardingContextType {
  showWelcome: () => void;
  hideWelcome: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only check once when component mounts
    if (hasChecked) return;
    
    // Don't show on auth pages or invite pages
    const isAuthPage = pathname?.startsWith("/log-in") || 
                       pathname?.startsWith("/signup") || 
                       pathname?.startsWith("/access-request") ||
                       pathname?.startsWith("/access-pending") ||
                       pathname?.startsWith("/i/") ||
                       pathname?.startsWith("/c/") ||
                       pathname?.startsWith("/invite-signup") ||
                       pathname?.startsWith("/code-signup");
    
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
          
          if (!data.onboardingSeen) {
            console.log("🎓 [Onboarding] User has NOT seen onboarding, showing modal in 800ms");
            // Small delay to ensure page is loaded
            setTimeout(() => {
              console.log("🎓 [Onboarding] Opening modal now");
              setIsWelcomeOpen(true);
            }, 800);
          } else {
            console.log("🎓 [Onboarding] User has already seen onboarding, skipping modal");
          }
        } else {
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
        console.error("🎓 [Onboarding] Error checking onboarding status:", error);
      } finally {
        setHasChecked(true);
      }
    };

    checkOnboardingStatus();
  }, [pathname, hasChecked]);

  const showWelcome = () => {
    setIsWelcomeOpen(true);
  };

  const hideWelcome = async () => {
    setIsWelcomeOpen(false);
    
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
      <WelcomeModal isOpen={isWelcomeOpen} onClose={hideWelcome} />
    </OnboardingContext.Provider>
  );
}

