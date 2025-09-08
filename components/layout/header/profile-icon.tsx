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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Show loading state briefly
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 hover:bg-background/20 transition-colors ${className}`}
        disabled
      >
        <User className={sizeClasses[size]} />
        <span className="sr-only">Profile</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`p-2 hover:bg-background/20 transition-colors ${className} ${
        isAuthenticated ? 'text-green-600' : 'text-gray-600'
      }`}
      asChild
    >
      <Link href={isAuthenticated ? "/profile" : "/log-in"} prefetch>
        <User className={sizeClasses[size]} />
        <span className="sr-only">
          {isAuthenticated ? "Profile" : "Sign In"}
        </span>
      </Link>
    </Button>
  );
}
