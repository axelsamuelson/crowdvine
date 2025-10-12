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
  const pathname = usePathname();

  useEffect(() => {
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
      return;
    }

    // Check if user has seen the welcome modal
    const hasSeenWelcome = localStorage.getItem("pact-welcome-seen");
    
    if (!hasSeenWelcome) {
      // Small delay to ensure page is loaded and user is authenticated
      const timer = setTimeout(() => {
        setIsWelcomeOpen(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  const showWelcome = () => {
    setIsWelcomeOpen(true);
  };

  const hideWelcome = () => {
    setIsWelcomeOpen(false);
    localStorage.setItem("pact-welcome-seen", "true");
  };

  return (
    <OnboardingContext.Provider value={{ showWelcome, hideWelcome }}>
      {children}
      <WelcomeModal isOpen={isWelcomeOpen} onClose={hideWelcome} />
    </OnboardingContext.Provider>
  );
}

