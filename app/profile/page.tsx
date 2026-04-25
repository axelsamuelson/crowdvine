"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { B2BProfileLayout } from "@/components/profile/b2b-profile-layout";
import { ReferralInviteCard } from "@/components/profile/referral-invite-card";
import { LevelBadge } from "@/components/membership/level-badge";
import { PactPointsTimeline, type PactPointsEvent } from "@/components/membership/pact-points-timeline";
import { Progress } from "@/components/ui/progress";
import {
  GoldCelebration,
  useGoldCelebration,
} from "@/components/membership/gold-celebration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
// PaymentMethodCard removed - using new payment flow
import { getLevelDisplayName, MembershipLevel } from "@/lib/membership/points-engine";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";
import { formatPrice } from "@/lib/shopify/utils";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  avatar_image_path?: string | null;
  created_at?: string;
}

interface MembershipData {
  membership: {
    level: MembershipLevel;
    impactPoints: number;
    levelAssignedAt: string;
    foundingMemberSince?: string | null;
  };
  pactPoints: {
    balance: number;
    lifetime: number;
    rolling12Months: number;
    currentTier: MembershipLevel;
    nextTier: MembershipLevel | null;
    pointsToNextTier: number | null;
    nextTierThreshold: number | null;
  };
  levelInfo: {
    level: MembershipLevel;
    name: string;
    minPoints: number;
    maxPoints: number;
    inviteQuota: number;
  };
  nextLevel: {
    level: MembershipLevel;
    name: string;
    pointsNeeded: number;
    minPoints: number;
  } | null;
  invites: {
    available: number;
    used: number;
    total: number;
  };
  perks: Array<{
    perk_type: string;
    perk_value: string;
    description: string;
  }>;
}

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

interface MilestoneVoucher {
  id: string;
  code: string;
  discount_percentage: number;
  expires_at: string | null;
  used: boolean;
}

function ProfilePageContent() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(
    null,
  );
  const [foundingSpotsRemaining, setFoundingSpotsRemaining] = useState<
    number | null
  >(null);
  const membershipTierTracked = useRef(false);

  useEffect(() => {
    if (!membershipData?.membership?.level || membershipTierTracked.current)
      return;
    membershipTierTracked.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "membership_tier_viewed",
      eventCategory: "account",
      metadata: { level: membershipData.membership.level },
    });
  }, [membershipData]);
  const [pactEvents, setPactEvents] = useState<PactPointsEvent[]>([]);
  // Payment methods removed - using new payment flow
  const [reservations, setReservations] = useState<any[]>([]);

  const orderStats = useMemo(() => {
    let bottles = 0;
    const producers = new Set<string>();
    for (const r of reservations) {
      for (const it of r.items || []) {
        bottles += Number(it.quantity) || 0;
        if (it.producer_name) producers.add(String(it.producer_name));
      }
    }
    return { bottles, uniqueProducers: producers.size };
  }, [reservations]);

  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  const [dashTab, setDashTab] = useState<"orders" | "activity" | "perks">(
    "orders",
  );
  const [referralInfo, setReferralInfo] = useState({
    inviteUrl: "",
    invitedCount: 0,
    activatedCount: 0,
  });

  type LastViewedProduct = {
    id: string;
    handle: string;
    title: string;
    producerName?: string;
    color?: string;
    imageUrl?: string;
    price?: string;
    currencyCode?: string;
    viewedAt: number;
  };

  const [lastViewedProducts, setLastViewedProducts] = useState<LastViewedProduct[]>([]);
  // v2: Gold celebration hook
  const { showCelebration, checkAndShowCelebration, closeCelebration } =
    useGoldCelebration();

  // Tastings count - must be before any conditional returns
  const [tastingsCount, setTastingsCount] = useState(0);

  // B2B: dirtywine.se in production; localhost = PACT (pactwines.com), use ?b2b=1 for B2B
  const searchParams = useSearchParams();
  const [isB2B, setIsB2B] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    const onProductionB2B = host.includes("dirtywine.se");
    const onLocalhost = host === "localhost" || host === "127.0.0.1";
    const forceB2B = searchParams.get("b2b") === "1";
    setIsB2B(onProductionB2B || (onLocalhost && forceB2B));
  }, [searchParams]);

  useEffect(() => {
    // Fetch tastings count
    fetch("/api/user/tastings")
      .then((res) => res.json())
      .then((data) => {
        setTastingsCount(data.tastings?.length || 0);
      })
      .catch(() => {});
  }, []);

  // Fetch all data
  useEffect(() => {
    Promise.all([
      fetchProfile(),
      fetchMembershipData(),
      fetchPactEvents(),
      fetchReservations(),
      fetchReferralLink(),
    ]).finally(() => setLoading(false));

    // Payment method setup check removed - using new payment flow
  }, []);

  const loadLastViewed = () => {
    try {
      if (typeof window === "undefined") return;
      const raw = window.localStorage.getItem("cv_last_viewed_products_v1");
      const list = raw ? JSON.parse(raw) : [];
      setLastViewedProducts(Array.isArray(list) ? list : []);
    } catch {
      setLastViewedProducts([]);
    }
  };

  useEffect(() => {
    loadLastViewed();
    const onUpdate = () => loadLastViewed();
    window.addEventListener("storage", onUpdate);
    window.addEventListener("cv:last_viewed_updated", onUpdate as EventListener);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("cv:last_viewed_updated", onUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!membershipData) return;
    if (typeof window === "undefined") return;
    const justUpgraded = localStorage.getItem("just_upgraded_to_gold") === "true";
    if (justUpgraded) {
      checkAndShowCelebration(membershipData.membership.level, true);
      localStorage.removeItem("just_upgraded_to_gold");
    }
  }, [membershipData, checkAndShowCelebration]);

  // Real-time subscription for invitations and IP updates
  useEffect(() => {
    if (!profile?.id) return;

    const supabase = getSupabaseBrowserClient();

    // Subscribe to invitation changes
    const invitationChannel = supabase
      .channel(`invitations:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invitation_codes",
          filter: `created_by=eq.${profile.id}`,
        },
        (payload) => {
          console.log("Invitation change:", payload);

          void fetchReferralLink();

          // If an invitation was used, show toast and refresh IP
          if (payload.eventType === "UPDATE" && payload.new?.used_at) {
            toast.success("Your invite was just used! +1 point awarded");
            fetchMembershipData();
            fetchPactEvents();
          }
        },
      )
      .subscribe();

    // Subscribe to PACT Points events (for real-time activity feed)
    const pactEventsChannel = supabase
      .channel(`pact-points-events:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pact_points_events",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log("New PACT Points event:", payload);

          fetchPactEvents();
          fetchMembershipData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invitationChannel);
      supabase.removeChannel(pactEventsChannel);
    };
  }, [profile?.id]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.status === 401) {
        setUnauthorized(true);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } else {
        console.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchReferralLink = async () => {
    try {
      const res = await fetch("/api/user/referral");
      if (res.ok) {
        const j = await res.json();
        setReferralInfo({
          inviteUrl: typeof j.inviteUrl === "string" ? j.inviteUrl : "",
          invitedCount:
            typeof j.invitedCount === "number" ? j.invitedCount : 0,
          activatedCount:
            typeof j.activatedCount === "number" ? j.activatedCount : 0,
        });
      }
    } catch (e) {
      console.error("Error fetching referral link:", e);
    }
  };

  const fetchMembershipData = async () => {
    try {
      const res = await fetch("/api/user/membership");
      if (res.ok) {
        const data = await res.json();
        setMembershipData(data);
      }
    } catch (error) {
      console.error("Error fetching membership:", error);
    }
  };

  useEffect(() => {
    if (membershipData?.membership.level !== "founding_member") {
      setFoundingSpotsRemaining(null);
      return;
    }
    fetch("/api/founding-member/spots-remaining")
      .then((res) => res.json())
      .then((data) => {
        const spots =
          data && typeof data === "object" && "spotsRemaining" in data
            ? (data as { spotsRemaining: unknown }).spotsRemaining
            : null;
        setFoundingSpotsRemaining(
          typeof spots === "number" ? spots : Number(spots ?? 0),
        );
      })
      .catch(() => setFoundingSpotsRemaining(null));
  }, [membershipData?.membership.level]);

  const fetchPactEvents = async () => {
    try {
      const res = await fetch("/api/user/pact-points/events?limit=10");
      if (res.ok) {
        const data = await res.json();
        setPactEvents(Array.isArray(data.events) ? data.events : []);
      }
    } catch (error) {
      console.error("Error fetching PACT Points events:", error);
    }
  };

  // fetchPaymentMethods removed - using new payment flow

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/user/reservations");
      if (res.ok) {
        const data = await res.json();
        // API returns array directly, not wrapped in object
        setReservations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
        </div>
      </PageLayout>
    );
  }

  if (unauthorized) {
    return (
      <PageLayout>
        <div className="pt-top-spacing px-4 sm:px-sides">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-center space-y-3">
            <h1 className="text-xl font-semibold">Logga in för att se din profil</h1>
            <p className="text-muted-foreground text-sm">
              Du behöver vara inloggad för att visa din profilsida.
            </p>
            <div className="flex justify-center">
              <Link
                href="/log-in"
                className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold hover:bg-foreground/90"
              >
                Gå till inloggning
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!profile || !membershipData) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load profile data</p>
        </div>
      </PageLayout>
    );
  }

  // B2B: business profile layout on dirtywine.se
  if (isB2B) {
    return (
      <B2BProfileLayout
        profile={profile}
        membershipData={membershipData}
        reservations={reservations}
        ipEvents={ipEvents}
      />
    );
  }

  // Get profile data for social header
  const userName = profile?.full_name || "User";
  const avatarUrl = profile?.avatar_image_path
    ? profile.avatar_image_path.startsWith("http")
      ? profile.avatar_image_path
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${profile.avatar_image_path}`
    : undefined;

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : undefined;

  const foundingSinceLabel = membershipData.membership.foundingMemberSince
    ? new Date(membershipData.membership.foundingMemberSince).toLocaleDateString(
        "en-US",
        { month: "long", day: "numeric", year: "numeric" },
      )
    : "Recently granted";

  const dashTabs = [
    { id: "orders" as const, label: "Orders", count: reservations.length },
    { id: "activity" as const, label: "Activity" },
    { id: "perks" as const, label: "Perks" },
  ];

  const reservationsTabContent = (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
            My Reservations
          </h2>
          <Link
            href="/profile/reservations"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-xl border border-gray-200/50 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-xs">Total Bottles</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {reservations.reduce((sum, r) => sum + ((r.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0)), 0)}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-gray-200/50 shadow-sm">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Unique Pallets</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {new Set(reservations.map((r) => r.pallet_id).filter(Boolean)).size}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 col-span-2">
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Most ordered bottles</h3>
                  <p className="text-xs text-muted-foreground">Top list, aggregated by wine.</p>
                </div>
              </div>
              {(() => {
                const map = new Map<string, any>();
                for (const r of reservations) {
                  for (const it of (r.items || [])) {
                    const key = `${it.wine_name || ""}|${it.vintage || ""}|${it.producer_name || ""}`;
                    const prev = map.get(key);
                    if (prev) {
                      prev.quantity += it.quantity || 0;
                    } else {
                      map.set(key, {
                        wine_name: it.wine_name,
                        vintage: it.vintage,
                        producer_name: it.producer_name,
                        color: it.color,
                        image_path: it.image_path,
                        quantity: it.quantity || 0,
                      });
                    }
                  }
                }
                const list = Array.from(map.values()).sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
                if (list.length === 0) {
                  return <p className="text-sm text-muted-foreground">No bottles yet.</p>;
                }
                return (
                  <div className="space-y-1">
                    {list.slice(0, 10).map((w) => (
                      <div
                        key={`${w.wine_name}-${w.vintage}-${w.producer_name}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                      >
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                          {w.image_path ? (
                            <img src={w.image_path} alt={w.wine_name || "Wine"} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {w.wine_name}{w.vintage ? ` ${w.vintage}` : ""}
                            </p>
                            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                              × {w.quantity}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-3">
                            <p className="truncate text-xs text-muted-foreground">
                              {w.producer_name || "Unknown producer"}
                            </p>
                            {w.color ? (
                              <span className="shrink-0 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                {w.color}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Last Viewed</h3>
              <div className="space-y-2">
                {lastViewedProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No recently viewed wines yet.</p>
                ) : (
                  lastViewedProducts.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.handle}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} alt={p.title} fill sizes="40px" className="object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-foreground">{p.title}</p>
                          {p.price && p.currencyCode ? (
                            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                              {formatPrice(p.price, p.currencyCode)}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-3">
                          <p className="truncate text-xs text-muted-foreground">
                            {p.producerName || "Unknown producer"}
                          </p>
                          {p.color ? (
                            <span className="shrink-0 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                              {p.color}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-2 md:px-sides xl:max-w-7xl xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-10">
        <div className="min-w-0 space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-border sm:h-20 sm:w-20">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={userName} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-lg text-primary">
                    {userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {userName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <LevelBadge
                    level={membershipData.membership.level}
                    size="md"
                    showLabel
                  />
                </div>
                {membershipData.membership.level === "founding_member" ? (
                  <div className="mt-3 w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-1">
                    <p className="text-sm font-medium text-amber-900">
                      Founding Member
                    </p>
                    <p className="text-xs text-amber-700">
                      Member since {foundingSinceLabel}
                    </p>
                    <p className="text-xs text-amber-700">
                      {typeof foundingSpotsRemaining === "number" &&
                      foundingSpotsRemaining > 0
                        ? `${foundingSpotsRemaining} of 100 founding spots remaining`
                        : "All 100 founding spots have been claimed"}
                    </p>
                  </div>
                ) : null}
                {joinedDate ? (
                  <p className="mt-1 text-sm text-muted-foreground">Joined {joinedDate}</p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start">
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link href="/profile/edit" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setDashTab("orders")}
              className={cn(
                "rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-foreground/20",
                dashTab === "orders" && "ring-2 ring-foreground/10",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Bottles ordered
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{orderStats.bottles}</p>
            </button>
            <button
              type="button"
              onClick={() => setDashTab("orders")}
              className={cn(
                "rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-foreground/20",
                dashTab === "orders" && "ring-2 ring-foreground/10",
              )}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Producers
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {orderStats.uniqueProducers}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setDashTab("activity")}
              className={cn(
                "rounded-md bg-popover border border-border px-4 py-3 text-left transition hover:border-foreground/20",
                dashTab === "activity" && "ring-2 ring-foreground/10",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  PACT Points
                </p>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums leading-none">
                {membershipData.pactPoints?.balance ?? 0}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {membershipData.pactPoints?.lifetime ?? 0} earned all time
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setDashTab("orders");
                document.getElementById("referral")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-xl border bg-card p-4 text-left shadow-sm transition hover:border-foreground/20"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Invited
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {referralInfo.invitedCount}
              </p>
            </button>
          </div>

          <ReferralInviteCard
            inviteUrl={referralInfo.inviteUrl}
            invitedCount={referralInfo.invitedCount}
            activatedCount={referralInfo.activatedCount}
          />

          <div className="border-b border-border">
            <div className="flex overflow-x-auto scrollbar-hide">
              {dashTabs.map((tab) => {
                const isActive = tab.id === dashTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDashTab(tab.id)}
                    className={cn(
                      "relative min-w-fit flex-1 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
                      isActive ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="relative inline-block">
                      {tab.label}
                      {"count" in tab && tab.count !== undefined ? (
                        <span className="ml-1 text-muted-foreground">({tab.count})</span>
                      ) : null}
                      {isActive ? (
                        <span className="absolute -bottom-3 left-0 right-0 h-0.5 rounded-full bg-primary" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2">
            {dashTab === "orders" ? reservationsTabContent : null}
            {dashTab === "activity" ? (
              <div className="space-y-3">
                <section className="flex justify-end">
                  <Link
                    href="/profile/activity"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Open full activity log
                  </Link>
                </section>
                <section className="space-y-3">
                  <div className="rounded-md bg-popover border border-border px-4 py-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      PACT Points
                    </p>
                    <p className="text-2xl font-semibold tabular-nums leading-none mt-1">
                      {membershipData.pactPoints.balance}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {membershipData.pactPoints.lifetime} earned all time
                    </p>
                  </div>
                </section>
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-foreground">
                    Membership level
                  </h2>
                  <div className="rounded-md bg-popover border border-border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <LevelBadge
                          level={membershipData.pactPoints.currentTier}
                          size="sm"
                          showLabel={false}
                        />
                        <span className="text-sm font-semibold truncate">
                          {getLevelDisplayName(membershipData.pactPoints.currentTier)}
                        </span>
                      </div>
                      <span className="text-sm font-medium tabular-nums shrink-0">
                        {membershipData.pactPoints.rolling12Months} pts
                      </span>
                    </div>

                    {membershipData.pactPoints.nextTier &&
                    membershipData.pactPoints.nextTierThreshold ? (
                      <div className="mt-3">
                        <div className="h-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-foreground"
                            style={{
                              width: `${Math.max(
                                0,
                                Math.min(
                                  100,
                                  (membershipData.pactPoints.rolling12Months /
                                    Math.max(
                                      1,
                                      membershipData.pactPoints.nextTierThreshold,
                                    )) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {membershipData.pactPoints.pointsToNextTier ?? 0} points to{" "}
                          {getLevelDisplayName(membershipData.pactPoints.nextTier)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Top tier reached
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-2">
                      Based on last 12 months
                    </p>
                  </div>
                </section>
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-foreground">
                    How to earn PACT Points
                  </h2>
                  <div className="rounded-md bg-popover border border-border px-4 py-3">
                    <p className="text-sm font-semibold mb-3">
                      Earn 1 point per bottle, multiplied by your tier
                    </p>

                    {(() => {
                      const current = membershipData.pactPoints.currentTier;
                      const tiers: Array<{ key: MembershipLevel; label: string; value: string }> = [
                        { key: "basic", label: getLevelDisplayName("basic"), value: "1×" },
                        { key: "brons", label: getLevelDisplayName("brons"), value: "1.5×" },
                        { key: "silver", label: getLevelDisplayName("silver"), value: "2×" },
                        { key: "guld", label: getLevelDisplayName("guld"), value: "3×" },
                        { key: "privilege", label: getLevelDisplayName("privilege"), value: "4×" },
                        { key: "founding_member", label: getLevelDisplayName("founding_member"), value: "5×" },
                      ];
                      return (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                          {tiers.map((t) => {
                            const isCurrent = t.key === current;
                            return (
                              <div key={t.key} className="flex justify-between text-xs">
                                <span
                                  className={cn(
                                    isCurrent
                                      ? "font-medium"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {t.label}
                                </span>
                                <span className="tabular-nums font-medium">
                                  {t.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <Separator className="my-3" />

                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Other ways to earn
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span>Invite a friend who orders</span>
                        <span className="tabular-nums font-medium">+30</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Review after delivery</span>
                        <span className="tabular-nums font-medium">+10</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Set delivery zone</span>
                        <span className="tabular-nums font-medium">+5</span>
                      </div>
                    </div>
                  </div>
                </section>
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-foreground">
                      Recent activity
                    </h2>
                    {pactEvents.length > 0 ? (
                      <Link
                        href="/profile/activity"
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        View all
                      </Link>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-popover border border-border px-4 py-3">
                    <PactPointsTimeline events={pactEvents} />
                  </div>
                </section>
              </div>
            ) : null}
            {dashTab === "perks" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">Your perks</h2>
                  <Link
                    href="/profile/perks"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Full perks page
                  </Link>
                </div>
                <div className="rounded-xl border border-border bg-card divide-y">
                  {(membershipData.perks || []).length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">No perks listed for your tier.</p>
                  ) : (
                    (membershipData.perks || []).map((perk) => (
                      <div
                        key={`${perk.perk_type}-${perk.description}`}
                        className="flex items-start justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{perk.description}</p>
                          <p className="text-xs capitalize text-muted-foreground">
                            {perk.perk_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        {perk.perk_value && perk.perk_value !== "true" ? (
                          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            {perk.perk_value}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="mt-10 hidden min-w-0 space-y-4 xl:mt-0 xl:block">
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Tip</p>
            <p className="mt-2 leading-snug">
              Use your personal invite link above to grow the community. Full search and discovery
              still live under{" "}
              <Link href="/shop" className="underline underline-offset-2">
                Shop
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
      {/* Gold Celebration Modal (v2) */}
      <GoldCelebration
        show={showCelebration}
        onClose={closeCelebration}
        userName={profile?.full_name}
      />
    </PageLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
          </div>
        </PageLayout>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
