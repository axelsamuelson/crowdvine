"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface ProfileIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProfileIcon({ className = "", size = "md" }: ProfileIconProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();

    // Listen for auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
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
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // Listen for storage changes (logout from other tabs)
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
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Show loading state briefly
  if (loading) {
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className={`p-2 hover:bg-background/20 transition-colors ${className}`}
          disabled
        >
          <div className="relative inline-flex items-center justify-center">
            <User className={sizeClasses[size]} />
          </div>
          <span className="sr-only">Profile</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Link href={isAuthenticated ? "/profile" : "/log-in"} prefetch>
        <Button
          variant="ghost"
          size="sm"
          className={`p-2 hover:bg-background/20 transition-colors ${className} ${
            isAuthenticated ? "text-green-600" : "text-gray-600"
          }`}
        >
          <div className="relative inline-flex items-center justify-center">
            <User className={sizeClasses[size]} />
          </div>
          <span className="sr-only">
            {isAuthenticated ? "Profile" : "Sign In"}
          </span>
        </Button>
      </Link>
    </div>
  );
}
