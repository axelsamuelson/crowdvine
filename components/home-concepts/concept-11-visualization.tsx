"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { 
  Package, 
  MapPin, 
  Wine, 
  User, 
  Calendar, 
  Settings, 
  Bell,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { PalletsLiveVisualization } from "./pallets-live-visualization";
import { MapClientWrapper } from "./map-client-wrapper";
import { YourFirstPallVisualization } from "./your-first-pall-visualization";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
}

interface MembershipData {
  membership: {
    level: string;
    impactPoints: number;
    levelAssignedAt: string;
  };
  levelInfo: {
    name: string;
    minPoints: number;
    maxPoints: number;
  };
  nextLevel?: {
    level: string;
    name: string;
    pointsNeeded: number;
    minPoints: number;
  } | null;
}

interface ReservationSummary {
  totalBottles: number;
  activeOrders: number;
  uniquePallets: number;
  pendingPayments: number;
  recentActivity?: {
    id: string;
    type: string;
    date: string;
  };
}

export function Concept11Visualization() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState({
    pallets: false,
    map: false,
    wineIdentity: false,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const profileRes = await fetch("/api/user/profile");
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile(profileData.profile);
        }

        // Fetch membership
        const membershipRes = await fetch("/api/user/membership");
        if (membershipRes.ok) {
          const membershipData = await membershipRes.json();
          setMembershipData(membershipData);
        }

        // Fetch reservations
        const reservationsRes = await fetch("/api/user/reservations");
        if (reservationsRes.ok) {
          const reservationsData = await reservationsRes.json();
          setReservations(Array.isArray(reservationsData) ? reservationsData : []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Load content on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setContentLoaded({
        pallets: true,
        map: true,
        wineIdentity: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const reservationSummary: ReservationSummary = useMemo(() => {
    const totalBottles = reservations.reduce((sum, reservation) => {
      const itemCount = Array.isArray(reservation.items)
        ? reservation.items.reduce((acc: number, item: any) => acc + (item?.quantity || 0), 0)
        : 0;
      const fallbackCount = reservation.quantity || 0;
      return sum + (itemCount > 0 ? itemCount : fallbackCount);
    }, 0);

    const pendingPayments = reservations.filter((r) => {
      const normalized = (r.payment_status || r.status || "").toLowerCase();
      return normalized === "pending" || normalized === "pending_payment";
    }).length;

    const recentReservation = reservations.length > 0 ? reservations[0] : null;

    return {
      totalBottles,
      activeOrders: reservations.length,
      uniquePallets: new Set(reservations.map((r) => r.pallet_id).filter(Boolean)).size,
      pendingPayments,
      recentActivity: recentReservation ? {
        id: recentReservation.id,
        type: "reservation",
        date: recentReservation.created_at || new Date().toISOString(),
      } : undefined,
    };
  }, [reservations]);

  const progressToNextLevel = useMemo(() => {
    if (!membershipData?.nextLevel) return null;
    const current = membershipData.membership.impactPoints;
    const currentMin = membershipData.levelInfo.minPoints;
    const nextMin = membershipData.nextLevel.minPoints;
    const range = nextMin - currentMin;
    const progress = range > 0 ? ((current - currentMin) / range) * 100 : 0;
    return Math.max(0, Math.min(100, progress));
  }, [membershipData]);

  const getUserInitials = useCallback(() => {
    if (profile?.full_name) {
      const names = profile.full_name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return profile.full_name.substring(0, 2).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.substring(0, 2).toUpperCase();
    }
    return "U";
  }, [profile]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Laddar...</p>
        </div>
      </div>
    );
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-32 bg-muted rounded"></div>
    </div>
  );

  // Grid items with different heights for masonry effect
  const gridItems = [
    {
      id: "pallets",
      title: "Se Pallar",
      description: "Utforska aktiva pallar",
      icon: Package,
      height: 650, // spans 33 rows (650/20)
      content: contentLoaded.pallets ? <PalletsLiveVisualization /> : <LoadingSkeleton />,
      badge: reservationSummary.uniquePallets > 0 ? `${reservationSummary.uniquePallets} aktiva` : null,
    },
    {
      id: "map",
      title: "Map",
      description: "Karta över producenter",
      icon: MapPin,
      height: 900, // spans 45 rows (900/20)
      content: contentLoaded.map ? <MapClientWrapper /> : <LoadingSkeleton />,
    },
    {
      id: "wine-identity",
      title: "Wine Identity",
      description: "Din första pall",
      icon: Wine,
      height: 750, // spans 38 rows (750/20)
      content: contentLoaded.wineIdentity ? <YourFirstPallVisualization /> : <LoadingSkeleton />,
    },
  ];

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col gap-6">
      {/* Welcome Box */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gradient-to-br from-muted/40 via-muted/30 to-muted/20 border border-border rounded-2xl p-6 md:p-8 shadow-button"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 flex-1">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-primary font-semibold text-xl flex-shrink-0">
              {getUserInitials()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground">
                  Welcome back, {profile?.full_name || profile?.email?.split("@")[0] || "User"}
                </h2>
                {membershipData && (
                  <Badge 
                    variant="default" 
                    className="text-xs capitalize"
                  >
                    {membershipData.levelInfo.name}
                  </Badge>
                )}
                {reservationSummary.pendingPayments > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="text-xs flex items-center gap-1"
                  >
                    <Bell className="w-3 h-3" />
                    {reservationSummary.pendingPayments} betalning{reservationSummary.pendingPayments > 1 ? "ar" : ""}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  {membershipData?.membership.impactPoints || 0} Impact Points
                </span>
                {membershipData?.nextLevel && (
                  <span className="flex items-center gap-2">
                    <span>Nästa nivå:</span>
                    <Badge variant="outline" className="text-xs">
                      {membershipData.nextLevel.name}
                    </Badge>
                  </span>
                )}
              </div>

              {/* Progress to next level */}
              {progressToNextLevel !== null && membershipData?.nextLevel && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Framsteg till {membershipData.nextLevel.name}</span>
                    <span>{Math.round(progressToNextLevel)}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressToNextLevel}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-primary/30 rounded-full"
                    />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <Link href="/profile">
                    <User className="w-4 h-4 mr-1" />
                    Profil
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                >
                  <Link href="/profile/reservations">
                    <Package className="w-4 h-4 mr-1" />
                    Reservat
                  </Link>
                </Button>
                {reservationSummary.pendingPayments > 0 && (
                  <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="rounded-full"
                  >
                    <Link href="/profile/reservations">
                      <Calendar className="w-4 h-4 mr-1" />
                      Betala ({reservationSummary.pendingPayments})
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 w-full md:w-auto">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 md:p-4 text-center shadow-button hover:shadow-button-hover transition-all cursor-pointer"
            >
              <Package className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Total bottles</p>
              <p className="text-lg md:text-xl font-semibold text-foreground">{reservationSummary.totalBottles}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 md:p-4 text-center shadow-button hover:shadow-button-hover transition-all cursor-pointer"
            >
              <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Active orders</p>
              <p className="text-lg md:text-xl font-semibold text-foreground">{reservationSummary.activeOrders}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 md:p-4 text-center shadow-button hover:shadow-button-hover transition-all cursor-pointer"
            >
              <Settings className="w-5 h-5 md:w-6 md:h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Pallets</p>
              <p className="text-lg md:text-xl font-semibold text-foreground">{reservationSummary.uniquePallets}</p>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Masonry Grid */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[20px]">
        {gridItems.map((item, index) => {
          const Icon = item.icon;
          const rowSpan = Math.ceil(item.height / 20);
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "rounded-lg border border-border overflow-hidden",
                "bg-muted/30 hover:border-foreground/20 transition-all duration-200 group",
                "flex flex-col shadow-button hover:shadow-button-hover"
              )}
              style={{
                gridRowEnd: `span ${rowSpan}`,
              }}
            >
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-border/50 bg-background/50">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base md:text-lg font-semibold text-foreground">{item.title}</h3>
                      {item.badge && (
                        <Badge variant="outline" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 md:p-6 overflow-auto min-h-0">
                {item.content}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
