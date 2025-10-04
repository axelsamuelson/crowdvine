"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ProgressHalo } from "@/components/ui/progress-components";
import { getPercentFilled } from "@/lib/utils/pallet-progress";

interface PalletIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PalletIcon({ className = "", size = "md" }: PalletIconProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPalletPercent, setMaxPalletPercent] = useState<number | null>(null);
  const [hasActivePallets, setHasActivePallets] = useState(false);

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
      
      // If authenticated, fetch reservations to calculate max pallet percent
      if (user) {
        fetchMaxPalletPercent();
      } else {
        setMaxPalletPercent(null);
        setHasActivePallets(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setMaxPalletPercent(null);
      setHasActivePallets(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaxPalletPercent = async () => {
    try {
      const response = await fetch("/api/user/reservations");
      if (response.ok) {
        const reservations = await response.json();
        
        // Calculate max percent among active pallets
        const activePallets = reservations.filter((res: any) => 
          res.status === 'OPEN' || res.status === 'CONSOLIDATING'
        );
        
        setHasActivePallets(activePallets.length > 0);
        
        if (activePallets.length === 0) {
          setMaxPalletPercent(null);
          return;
        }
        
        const maxPercent = Math.max(...activePallets.map((res: any) => {
          const percent = getPercentFilled({
            reserved_bottles: res.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0,
            capacity_bottles: undefined, // TODO: Get from backend
            percent_filled: undefined, // TODO: Get from backend
            status: res.status.toUpperCase() as any
          });
          return percent || 0;
        }));
        
        setMaxPalletPercent(maxPercent > 0 ? maxPercent : null);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setMaxPalletPercent(null);
      setHasActivePallets(false);
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

  // Don't show if not authenticated or no active pallets
  if (!isAuthenticated || !hasActivePallets) {
    return null;
  }

  // Show loading state briefly
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 hover:bg-background/20 transition-colors ${className}`}
        disabled
      >
        <Package className={sizeClasses[size]} />
        <span className="sr-only">Pallets</span>
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`p-2 hover:bg-background/20 transition-colors ${className} ${
        hasActivePallets ? "text-green-600" : "text-gray-600"
      }`}
      asChild
    >
      <Link href="/profile" prefetch>
        <div className="relative">
          <Package className={sizeClasses[size]} />
          {/* Progress halo for active pallets */}
          {maxPalletPercent !== null && (
            <ProgressHalo 
              valuePercent={maxPalletPercent} 
              size="sm" 
              className="absolute inset-0"
            />
          )}
        </div>
        <span className="sr-only">
          Active Pallets ({maxPalletPercent}% filled)
        </span>
      </Link>
    </Button>
  );
}
