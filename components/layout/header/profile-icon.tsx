"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  isAuthNetworkError,
  isStaleRefreshTokenError,
} from "@/lib/auth/session-errors";

interface ProfileIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  /** Accessible + optional visible label (e.g. Swedish "Profil"). */
  label?: string;
  /** When true, show the label as visible text (no uppercase) instead of icon-only. */
  showLabel?: boolean;
}

export function ProfileIcon({
  className = "",
  size = "md",
  label = "Profil",
  showLabel = false,
}: ProfileIconProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      if (isStaleRefreshTokenError(error)) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* ignore */
        }
      } else if (
        !isAuthNetworkError(error) &&
        process.env.NODE_ENV === "development"
      ) {
        console.error("Error checking auth status:", error);
      }
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "supabase.auth.token") {
        checkAuthStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const sizeClasses = {
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  const handleClick = () => {
    router.push(isAuthenticated ? "/profile" : "/log-in");
  };

  const buttonClass = `p-2 transition-colors rounded-md relative items-center gap-1.5 ${className} ${
    loading
      ? "opacity-50 cursor-not-allowed"
      : isAuthenticated
        ? "hover:bg-background/20"
        : "hover:bg-background/10 opacity-80"
  }`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={buttonClass}
        onClick={loading ? undefined : handleClick}
        disabled={loading}
        aria-label={label}
      >
        {showLabel ? (
          <span className="text-sm font-semibold normal-case tracking-normal">
            {label}
          </span>
        ) : (
          <>
            <div className="relative">
              <User className={sizeClasses[size]} />
            </div>
            <span className="absolute sr-only">{label}</span>
          </>
        )}
      </button>
    </div>
  );
}
