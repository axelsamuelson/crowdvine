"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  ProgressHalo,
  MiniProgress,
} from "@/components/ui/progress-components";
import {
  getPercentFilled,
  formatPercent,
  shouldShowPercent,
} from "@/lib/utils/pallet-progress";

interface PalletIconProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function PalletIcon({ className = "", size = "md" }: PalletIconProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxPalletPercent, setMaxPalletPercent] = useState<number | null>(null);
  const [hasActivePallets, setHasActivePallets] = useState(false);
  const [hasPendingPayments, setHasPendingPayments] = useState(false);
  const [hasNinetyPercentWarning, setHasNinetyPercentWarning] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [reservations, setReservations] = useState<any[]>([]);
  const [palletData, setPalletData] = useState<Map<string, any>>(new Map());
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
        setHasPendingPayments(false);
        setHasNinetyPercentWarning(false);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setMaxPalletPercent(null);
      setHasActivePallets(false);
      setHasPendingPayments(false);
      setHasNinetyPercentWarning(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaxPalletPercent = async () => {
    try {
      const response = await fetch("/api/user/reservations");
      if (response.ok) {
        const reservationsData = await response.json();
        console.log(`📦 Total reservations fetched:`, reservationsData.length);
        console.log(
          `📦 First reservation status:`,
          reservationsData[0]?.status,
        );
        setReservations(reservationsData);

        // Check for pending payments - only when pallet is complete (100% full)
        const pendingPayments = reservationsData.filter((res: any) => {
          // Only show payment notification if:
          // 1. Reservation has pending payment status AND
          // 2. The pallet is marked as complete (100% full) AND
          // 3. We can verify the pallet is actually full by checking bottle count

          // Count bottles in this reservation
          const reservationBottles =
            res.items?.reduce(
              (total: number, item: any) => total + (item.quantity || 0),
              0,
            ) || 0;

          // If pallet is marked complete but has very few bottles, it's likely incorrectly marked
          // Only show payment notification if pallet has substantial bottle count (at least 50 bottles)
          const isActuallyFull =
            res.pallet_is_complete &&
            res.pallet_capacity &&
            res.pallet_capacity > 0 &&
            reservationBottles >= 50; // Safety threshold

          return (
            (res.payment_status === "pending" ||
              res.status === "pending_payment") &&
            isActuallyFull
          );
        });
        console.log(
          `💳 Pending payments found (pallet complete):`,
          pendingPayments.length,
        );
        setHasPendingPayments(pendingPayments.length > 0);

        // Check for 90% warning - pallets that are getting close to full but not yet complete
        const ninetyPercentPallets = reservationsData.filter((res: any) => {
          const reservationBottles =
            res.items?.reduce(
              (total: number, item: any) => total + (item.quantity || 0),
              0,
            ) || 0;
          const percentFull = res.pallet_capacity
            ? (reservationBottles / res.pallet_capacity) * 100
            : 0;

          // Show warning if pallet is 90%+ full but not complete and no pending payments
          return (
            percentFull >= 90 &&
            !res.pallet_is_complete &&
            res.pallet_capacity &&
            res.pallet_capacity > 0 &&
            res.status !== "pending_payment"
          );
        });

        console.log(
          `⚠️ 90% warning pallets found:`,
          ninetyPercentPallets.length,
        );
        setHasNinetyPercentWarning(ninetyPercentPallets.length > 0);

        // Calculate max percent among active pallets
        const activePallets = reservationsData.filter((res: any) => {
          const s = String(res?.status || "");
          return (
            s === "pending_producer_approval" ||
            s === "approved" ||
            s === "partly_approved" ||
            s === "placed" ||
            s === "pending_payment" ||
            s === "confirmed" ||
            s === "OPEN" ||
            s === "CONSOLIDATING"
          );
        });

        console.log(`📦 Active pallets after filter:`, activePallets.length);

        setHasActivePallets(activePallets.length > 0);

        if (activePallets.length === 0) {
          setMaxPalletPercent(null);
          return;
        }

        // For now, since pallet IDs are "unassigned", let's calculate percentage based on user's own reservations
        // This is a temporary solution until pallet assignment is properly implemented
        console.log(`🔍 Active pallets data:`, activePallets);
        console.log(`🔍 First reservation sample:`, activePallets[0]);
        console.log(
          `🔍 All reservation keys:`,
          activePallets[0] ? Object.keys(activePallets[0]) : "No reservations",
        );
        console.log(`🔍 Zone data check:`, {
          pickup_zone_id: activePallets[0]?.pickup_zone_id,
          delivery_zone_id: activePallets[0]?.delivery_zone_id,
          pickup_zone: activePallets[0]?.pickup_zone,
          delivery_zone: activePallets[0]?.delivery_zone,
          pallet_id: activePallets[0]?.pallet_id,
          pallet_name: activePallets[0]?.pallet_name,
        });

        // Fetch real pallet data from the database (like checkout page does)
        const palletDataMap = new Map();
        let maxPercent = 0;

        // Get unique pallet IDs from reservations (skip 'unassigned')
        const allPalletIds = activePallets.map((res: any) => res.pallet_id);
        console.log(`🔍 All pallet IDs (before filter):`, allPalletIds);

        const uniquePalletIds = [
          ...new Set(
            activePallets
              .map((res: any) => res.pallet_id)
              .filter((id: string) => id && id !== "unassigned"),
          ),
        ];

        console.log(
          `🔍 Unique pallet IDs from reservations (after filter):`,
          uniquePalletIds,
        );

        if (uniquePalletIds.length > 0) {
          // Fetch pallet data from database
          try {
            console.log(`🔄 Fetching pallet data for IDs:`, uniquePalletIds);
            const palletResponse = await fetch("/api/pallet-data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ palletIds: uniquePalletIds }),
            });

            console.log(
              `📡 Pallet API response status:`,
              palletResponse.status,
            );

            if (palletResponse.ok) {
              const palletData = await palletResponse.json();
              console.log(`📊 Fetched pallet data:`, palletData);

              // Process each pallet
              palletData.pallets?.forEach((pallet: any) => {
                const userBottles = activePallets
                  .filter((res: any) => res.pallet_id === pallet.id)
                  .reduce((total: number, res: any) => {
                    return (
                      total +
                      (res.items?.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      ) || 0)
                    );
                  }, 0);

                const percentage =
                  pallet.bottle_capacity > 0
                    ? Math.min(
                        Math.round(
                          (pallet.current_bottles / pallet.bottle_capacity) *
                            100,
                        ),
                        100,
                      )
                    : 0;

                console.log(
                  `✅ Pallet ${pallet.id} (${pallet.name}): ${pallet.current_bottles}/${pallet.bottle_capacity} = ${percentage}%`,
                );

                palletDataMap.set(pallet.id, {
                  id: pallet.id,
                  name: pallet.name,
                  total_reserved_bottles: pallet.current_bottles,
                  percentage_filled: percentage,
                  user_bottles: userBottles,
                  capacity: pallet.bottle_capacity,
                });

                if (percentage > maxPercent) {
                  maxPercent = percentage;
                }
              });
            } else {
              console.error(
                `❌ Pallet API error:`,
                await palletResponse.text(),
              );
            }
          } catch (error) {
            console.error("❌ Error fetching pallet data:", error);
          }
        }

        console.log(`📈 Max percentage: ${maxPercent}%`);
        setMaxPalletPercent(maxPercent > 0 ? maxPercent : null);
        setPalletData(palletDataMap);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setMaxPalletPercent(null);
      setHasActivePallets(false);
      setHasPendingPayments(false);
      setHasNinetyPercentWarning(false);
      setReservations([]);
      setPalletData(new Map());
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
    sm: "size-4",
    md: "size-5",
    lg: "size-6",
  };

  // Don't show if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show loading state briefly
  if (loading) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          className={`p-2 hover:bg-background/20 transition-colors rounded-md opacity-50 cursor-not-allowed relative ${className}`}
          disabled
        >
          <div className="relative">
            <Package className={sizeClasses[size]} />
          </div>
          <span className="absolute sr-only">Pallets</span>
        </button>
      </div>
    );
  }

  // Group reservations by pallet_id
  const palletMap = new Map();
  reservations.forEach((reservation) => {
    const palletId = reservation.pallet_id || "unassigned";
    const palletName = reservation.pallet_name || "Unassigned Pallet";

    // Map reservation status to pallet status
    const mapStatus = (resStatus: string) => {
      if (resStatus === "placed") return "OPEN";
      if (resStatus === "pending") return "OPEN";
      if (resStatus === "confirmed") return "CONSOLIDATING";
      if (resStatus === "shipped") return "SHIPPED";
      if (resStatus === "delivered") return "DELIVERED";
      return "OPEN"; // Default to OPEN
    };

    if (!palletMap.has(palletId)) {
      palletMap.set(palletId, {
        id: palletId,
        name: palletName,
        capacity: reservation.pallet_capacity || 120, // Use actual capacity from API
        status: mapStatus(reservation.status || "pending"),
        totalReservedBottles: 0, // Total bottles reserved by all users
        myReservedBottles: 0, // Bottles reserved by current user
        latestDate: reservation.created_at,
        reservations: [],
      });
    }

    const pallet = palletMap.get(palletId);
    const reservationBottles =
      reservation.items?.reduce(
        (total: number, item: any) => total + item.quantity,
        0,
      ) || 0;

    // Count all reserved bottles (total) - for now, this is just the user's bottles
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
    const statusOrder: { [key: string]: number } = {
      OPEN: 0,
      CONSOLIDATING: 1,
      SHIPPED: 2,
      DELIVERED: 3,
    };
    const aOrder = statusOrder[a.status.toUpperCase()] || 0;
    const bOrder = statusOrder[b.status.toUpperCase()] || 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime();
  });

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        className={`p-2 hover:bg-background/20 transition-colors rounded-md relative ${className}`}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {/* Ultra-thin progress halo for active pallets */}
        <div className="relative">
          <Package
            className={`${sizeClasses[size]} ${
              hasPendingPayments
                ? "text-amber-500"
                : hasNinetyPercentWarning
                  ? "text-blue-500"
                  : "text-foreground"
            }`}
          />

          {/* Existing progress halo - hide when payment required or 90% warning */}
          {maxPalletPercent !== null &&
            !hasPendingPayments &&
            !hasNinetyPercentWarning && (
              <ProgressHalo
                valuePercent={maxPalletPercent}
                size="sm"
                className="absolute inset-0 opacity-40 pointer-events-none"
              />
            )}

          {/* Badge priority: Payment > 90% Warning > Normal Count */}
          {hasPendingPayments ? (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center animate-pulse pointer-events-none">
              <span className="text-white text-[10px] font-bold leading-none">
                !
              </span>
            </div>
          ) : hasNinetyPercentWarning ? (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center animate-pulse pointer-events-none">
              <span className="text-white text-[10px] font-bold leading-none">
                !
              </span>
            </div>
          ) : (
            hasActivePallets &&
            sortedPallets.length > 0 && (
              <div className="absolute -top-0.5 -right-0.5 min-w-[10px] h-[10px] flex items-center justify-center bg-foreground text-background rounded-full pointer-events-none">
                <span className="text-[7px] font-semibold leading-none px-[2px]">
                  {sortedPallets.length}
                </span>
              </div>
            )
          )}
        </div>
        <span className="absolute sr-only">
          {hasPendingPayments
            ? "Payment Required"
            : hasNinetyPercentWarning
              ? "Pallet Nearly Full"
              : hasActivePallets
                ? `${sortedPallets.length} Active Pallets`
                : "Pallets"}
        </span>
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-2xl shadow-black/10 border border-gray-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2 border-b border-gray-50">
            <h3 className="text-xs font-medium text-gray-900 tracking-wide uppercase">
              My Pallets
            </h3>
          </div>
          {sortedPallets.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Package className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-1">
                Your pallets will show here
              </p>
              <p className="text-xs text-gray-400">
                Make a reservation to join a pallet
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto py-2">
              {sortedPallets.slice(0, 5).map((pallet) => {
                // Get pallet data from API for accurate percentages
                const palletApiData = palletData.get(pallet.id);
                console.log(
                  `🎯 Pallet ${pallet.id} (${pallet.name}) - API data:`,
                  palletApiData,
                );

                // Use API data if available, otherwise fall back to calculated data
                const totalReservedBottles =
                  palletApiData?.total_reserved_bottles ||
                  pallet.totalReservedBottles;
                const userBottles =
                  palletApiData?.user_bottles || pallet.myReservedBottles;
                const percentageFilled =
                  palletApiData?.percentage_filled ||
                  getPercentFilled({
                    reserved_bottles: pallet.totalReservedBottles,
                    capacity_bottles: pallet.capacity,
                    percent_filled: undefined,
                    status: pallet.status.toUpperCase() as any,
                  });

                console.log(
                  `📊 Pallet ${pallet.id}: status="${pallet.status}", API percentage=${palletApiData?.percentage_filled}, fallback=${percentageFilled}, shouldShowPercent=${shouldShowPercent(pallet.status)}`,
                );

                const showPercent = shouldShowPercent(pallet.status);
                const displayPercent = showPercent
                  ? formatPercent(percentageFilled)
                  : "—%";

                console.log(
                  `📊 Final display for ${pallet.id}: showPercent=${showPercent}, displayPercent="${displayPercent}"`,
                );

                return (
                  <Link key={pallet.id} href="/profile/reservations">
                    <div className="px-4 py-4 hover:bg-gray-50/50 cursor-pointer transition-all hover:scale-[0.99] group">
                      {/* Row 1: Pallet name + status tag */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {pallet.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Payment Required Badge - only when pallet is actually complete */}
                          {pallet.reservations.some((r: any) => {
                            const reservationBottles =
                              r.items?.reduce(
                                (total: number, item: any) =>
                                  total + (item.quantity || 0),
                                0,
                              ) || 0;
                            return (
                              (r.payment_status === "pending" ||
                                r.status === "pending_payment") &&
                              r.pallet_is_complete === true &&
                              r.pallet_capacity &&
                              r.pallet_capacity > 0 &&
                              reservationBottles >= 50
                            ); // Safety threshold
                          }) && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-medium tracking-wide px-1.5 py-0.5">
                              Payment Required
                            </Badge>
                          )}

                          {/* 90% Warning Badge - when pallet is nearly full */}
                          {!pallet.reservations.some((r: any) => {
                            const reservationBottles =
                              r.items?.reduce(
                                (total: number, item: any) =>
                                  total + (item.quantity || 0),
                                0,
                              ) || 0;
                            return (
                              (r.payment_status === "pending" ||
                                r.status === "pending_payment") &&
                              r.pallet_is_complete === true
                            );
                          }) &&
                            pallet.reservations.some((r: any) => {
                              const reservationBottles =
                                r.items?.reduce(
                                  (total: number, item: any) =>
                                    total + (item.quantity || 0),
                                  0,
                                ) || 0;
                              const percentFull = r.pallet_capacity
                                ? (reservationBottles / r.pallet_capacity) * 100
                                : 0;
                              return (
                                percentFull >= 90 &&
                                !r.pallet_is_complete &&
                                r.pallet_capacity &&
                                r.pallet_capacity > 0
                              );
                            }) && (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[9px] font-medium tracking-wide px-1.5 py-0.5">
                                Nearly Full
                              </Badge>
                            )}
                          {/* Pallet Status Badge */}
                          <Badge
                            className={`text-[10px] rounded-full font-medium tracking-wide px-2 py-0.5 ${
                              pallet.status === "CONSOLIDATING"
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : pallet.status === "OPEN"
                                  ? "bg-gray-50 text-gray-500 border-gray-100"
                                  : pallet.status === "SHIPPED"
                                    ? "bg-gray-100 text-gray-600 border-gray-200"
                                    : pallet.status === "DELIVERED"
                                      ? "bg-gray-100 text-gray-600 border-gray-200"
                                      : "bg-gray-50 text-gray-500 border-gray-100"
                            }`}
                          >
                            {pallet.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Row 2: Meta info with percentage and user's reservation */}
                      <div className="space-y-2">
                        <div className="text-[10px] text-gray-500 tracking-wide">
                          <span className="font-semibold text-gray-900 tracking-wider">
                            {displayPercent}
                          </span>
                          <span className="text-gray-400"> • </span>
                          <span>Total: {totalReservedBottles}</span>
                          <span className="text-gray-400"> • </span>
                          <span>My bottles: {userBottles}</span>
                        </div>

                        {/* Micro progress bar */}
                        <MiniProgress
                          valuePercent={showPercent ? percentageFilled : null}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          {sortedPallets.length > 5 && (
            <div className="px-4 py-2 border-t border-gray-50">
              <Link
                href="/profile"
                className="text-[10px] text-gray-500 hover:text-gray-900 transition-colors tracking-wide"
              >
                View all pallets →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
