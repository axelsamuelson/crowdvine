"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronDown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ProgressHalo, MiniProgress } from "@/components/ui/progress-components";
import { getPercentFilled, formatPercent, shouldShowPercent } from "@/lib/utils/pallet-progress";

interface PalletIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PalletIcon({ className = "", size = "md" }: PalletIconProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPalletPercent, setMaxPalletPercent] = useState<number | null>(null);
  const [hasActivePallets, setHasActivePallets] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        const reservationsData = await response.json();
        setReservations(reservationsData);
        
        // Calculate max percent among active pallets
        const activePallets = reservationsData.filter((res: any) => 
          res.status === 'OPEN' || res.status === 'CONSOLIDATING'
        );
        
        setHasActivePallets(activePallets.length > 0);
        
        if (activePallets.length === 0) {
          setMaxPalletPercent(null);
          return;
        }
        
        // Group by pallet_id to get total bottles per pallet for percentage calculation
        const palletTotals = new Map();
        activePallets.forEach((res: any) => {
          const palletId = res.pallet_id || 'unassigned';
          const bottles = res.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
          const capacity = res.pallet_capacity;
          
          if (!palletTotals.has(palletId)) {
            palletTotals.set(palletId, { totalBottles: 0, capacity });
          }
          
          const pallet = palletTotals.get(palletId);
          pallet.totalBottles += bottles;
        });
        
        const maxPercent = Math.max(...Array.from(palletTotals.values()).map((pallet: any) => {
          const percent = getPercentFilled({
            reserved_bottles: pallet.totalBottles,
            capacity_bottles: pallet.capacity,
            percent_filled: undefined, // TODO: Get from backend if available
            status: 'OPEN' // Assume OPEN for active pallets
          });
          return percent || 0;
        }));
        
        setMaxPalletPercent(maxPercent > 0 ? maxPercent : null);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setMaxPalletPercent(null);
      setHasActivePallets(false);
      setReservations([]);
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Don't show if not authenticated
  if (!isAuthenticated) {
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

  // Group reservations by pallet_id
  const palletMap = new Map();
  reservations.forEach((reservation) => {
    const palletId = reservation.pallet_id || 'unassigned';
    const palletName = reservation.pallet_name || 'Pallet Assignment Pending';
    
    if (!palletMap.has(palletId)) {
      palletMap.set(palletId, {
        id: palletId,
        name: palletName,
        capacity: reservation.pallet_capacity,
        status: reservation.status || 'OPEN',
        totalReservedBottles: 0, // Total bottles reserved by all users
        myReservedBottles: 0,    // Bottles reserved by current user
        latestDate: reservation.created_at,
        reservations: []
      });
    }
    
    const pallet = palletMap.get(palletId);
    const reservationBottles = reservation.items?.reduce((total: number, item: any) => total + item.quantity, 0) || 0;
    
    // Count all reserved bottles (total)
    pallet.totalReservedBottles += reservationBottles;
    
    // Count current user's bottles (since these are user's own reservations)
    pallet.myReservedBottles += reservationBottles;
    
    pallet.reservations.push(reservation);
    
    // Use most recent status
    if (new Date(reservation.created_at) > new Date(pallet.latestDate)) {
      pallet.latestDate = reservation.created_at;
    }
  });
  
  // Sort pallets: OPEN/CONSOLIDATING first, then by date
  const sortedPallets = Array.from(palletMap.values()).sort((a, b) => {
    const statusOrder: { [key: string]: number } = { 'OPEN': 0, 'CONSOLIDATING': 1, 'SHIPPED': 2, 'DELIVERED': 3 };
    const aOrder = statusOrder[a.status.toUpperCase()] || 0;
    const bOrder = statusOrder[b.status.toUpperCase()] || 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        className={`p-2 hover:bg-background/20 transition-colors ${className} ${
          isAuthenticated ? "text-green-600" : "text-gray-600"
        }`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
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
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        <span className="sr-only">
          {hasActivePallets ? `Active Pallets (${maxPalletPercent}% filled)` : "Pallets"}
        </span>
      </Button>

      {/* Dropdown */}
      {isDropdownOpen && sortedPallets.length > 0 && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">My Pallets</h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sortedPallets.slice(0, 5).map((pallet) => {
              // Calculate pallet fill percentage using total reserved bottles
              const percentFilled = getPercentFilled({
                reserved_bottles: pallet.totalReservedBottles,
                capacity_bottles: pallet.capacity,
                percent_filled: undefined, // TODO: Get from backend if available
                status: pallet.status.toUpperCase() as any
              });
              
              const showPercent = shouldShowPercent(pallet.status);
              const displayPercent = showPercent ? formatPercent(percentFilled) : '—%';
              
              return (
                <Link key={pallet.id} href={`/pallet/${pallet.id}`}>
                  <div className="px-3 py-3 hover:bg-gray-50 cursor-pointer">
                    {/* Row 1: Pallet name + status tag */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {pallet.name}
                        </span>
                      </div>
                      <Badge 
                        className={`text-xs rounded-full ${
                          pallet.status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                          pallet.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          pallet.status === 'shipped' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          pallet.status === 'delivered' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                          'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {pallet.status === 'confirmed' ? 'CONSOLIDATING' : 
                         pallet.status === 'pending' ? 'OPEN' : 
                         pallet.status === 'shipped' ? 'SHIPPED' :
                         pallet.status === 'delivered' ? 'DELIVERED' : 'OPEN'}
                      </Badge>
                    </div>
                    
                    {/* Row 2: Meta info with percentage and user's reservation */}
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        <span className="font-medium">{displayPercent}</span>
                        <span> • Total: {pallet.totalReservedBottles} • My bottles: {pallet.myReservedBottles}</span>
                      </div>
                      
                      {/* Micro progress bar */}
                      <MiniProgress valuePercent={showPercent ? percentFilled : null} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {sortedPallets.length > 5 && (
            <div className="px-3 py-2 border-t border-gray-100">
              <Link href="/profile" className="text-xs text-gray-500 hover:text-gray-700">
                View all pallets →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
