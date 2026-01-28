"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";

interface B2BContextType {
  isB2BMode: boolean;
  toggleB2BMode: () => void;
  canToggle: boolean;
}

const B2BContext = createContext<B2BContextType | undefined>(undefined);

export function B2BProvider({ children }: { children: ReactNode }) {
  const { roles, loading } = useUserRole();
  const [isB2BMode, setIsB2BMode] = useState(false);

  // Check if user has both USER and BUSINESS roles
  const hasUserRole = roles.includes("user");
  const hasBusinessRole = roles.includes("business");
  const canToggle = hasUserRole && hasBusinessRole;

  // Debug logging
  useEffect(() => {
    if (!loading) {
      console.log("[B2B] Roles:", roles);
      console.log("[B2B] Has user role:", hasUserRole);
      console.log("[B2B] Has business role:", hasBusinessRole);
      console.log("[B2B] Can toggle:", canToggle);
    }
  }, [loading, roles, hasUserRole, hasBusinessRole, canToggle]);

  // Load B2B mode preference from localStorage
  useEffect(() => {
    if (!loading && canToggle) {
      const saved = localStorage.getItem("b2bMode");
      if (saved === "true") {
        setIsB2BMode(true);
      }
    } else if (!canToggle) {
      // If user doesn't have both roles, set mode based on their roles
      setIsB2BMode(hasBusinessRole && !hasUserRole);
    }
  }, [loading, canToggle, hasUserRole, hasBusinessRole]);

  const toggleB2BMode = () => {
    if (!canToggle) return;
    setIsB2BMode((prev) => {
      const newValue = !prev;
      localStorage.setItem("b2bMode", String(newValue));
      return newValue;
    });
  };

  return (
    <B2BContext.Provider value={{ isB2BMode, toggleB2BMode, canToggle }}>
      {children}
    </B2BContext.Provider>
  );
}

export function useB2B() {
  const context = useContext(B2BContext);
  if (context === undefined) {
    throw new Error("useB2B must be used within a B2BProvider");
  }
  return context;
}
