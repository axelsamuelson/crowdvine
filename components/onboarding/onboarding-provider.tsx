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
        const response = await fetch("/api/user/onboarding-seen");
        if (response.ok) {
          const data = await response.json();
          
          if (!data.onboardingSeen) {
            // Small delay to ensure page is loaded
            setTimeout(() => {
              setIsWelcomeOpen(true);
            }, 800);
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
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

