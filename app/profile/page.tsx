"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { SocialProfileHeader } from "@/components/profile/social-profile-header";
import { SocialProfileTabs } from "@/components/profile/social-profile-tabs";
import { B2BProfileLayout } from "@/components/profile/b2b-profile-layout";
import { LevelBadge } from "@/components/membership/level-badge";
import { PerksGrid, LockedPerks } from "@/components/membership/perks-grid";
import { IPTimeline } from "@/components/membership/ip-timeline";
import { LevelProgress } from "@/components/membership/level-progress";
import { InviteQuotaDisplay } from "@/components/membership/invite-quota-display";
import { ProgressionBuffDisplay } from "@/components/membership/progression-buff-display";
import {
  GoldCelebration,
  useGoldCelebration,
} from "@/components/membership/gold-celebration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Plus, 
  Edit, 
  Save, 
  X,
  UserPlus,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Calendar,
  Package,
  Settings,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { buildInviteUrl, getBaseUrlForInvite } from "@/lib/invitation-path";
import Image from "next/image";
import { toast } from "sonner";
// PaymentMethodCard removed - using new payment flow
import { MiniProgress } from "@/components/ui/progress-components";
import { getTimeUntilReset } from "@/lib/membership/invite-quota";
import { MembershipLevel } from "@/lib/membership/points-engine";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/shopify/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface MembershipData {
  membership: {
    level: MembershipLevel;
    impactPoints: number;
    levelAssignedAt: string;
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

function ProfilePageContent() {
  const router = useRouter();

  type SearchResultUser = { id: string; full_name?: string; description?: string; avatar_image_path?: string | null };
  type SearchResultWine = { id: string; name: string; handle: string; producerName: string; color?: string | null; imageUrl?: string | null; priceCents?: number | null };
  type SearchResultProducer = { id: string; name: string; region?: string | null; handle: string; logoUrl?: string | null };
  type SearchResults = { users: SearchResultUser[]; wines: SearchResultWine[]; producers: SearchResultProducer[] };

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults>({ users: [], wines: [], producers: [] });
  const [searchActiveIndex, setSearchActiveIndex] = useState(0);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(
    null,
  );
  const [ipEvents, setIpEvents] = useState<any[]>([]);
  // Payment methods removed - using new payment flow
  const [reservations, setReservations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<MembershipLevel>("basic");
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Sweden",
  });

  // v2: Progression buffs state
  const [progressionBuffs, setProgressionBuffs] = useState<any[]>([]);
  const [totalBuffPercentage, setTotalBuffPercentage] = useState(0);

  // Social profile state
  const [activeTab, setActiveTab] = useState("reservations");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

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
      fetchIPEvents(),
      // fetchPaymentMethods removed - using new payment flow
      fetchReservations(),
      fetchInvitations(),
      fetchProgressionBuffs(), // v2: fetch progression buffs
      fetchSuggestedUsers(),
      fetchFollowStats(),
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

  const searchSectioned = useMemo(() => {
    type Item = {
      key: string;
      href: string;
      title: string;
      subtitle?: string;
      imageUrl?: string | null;
      badge?: string;
    };

    const users: Item[] = (searchResults.users || []).map((u) => ({
      key: `user-${u.id}`,
      href: `/profile/${u.id}`,
      title: u.full_name || "User",
      subtitle: u.description || undefined,
      imageUrl: u.avatar_image_path || undefined,
      badge: "User",
    }));

    const wines: Item[] = (searchResults.wines || []).map((w) => ({
      key: `wine-${w.id}`,
      href: `/product/${w.handle}`,
      title: w.name,
      subtitle: w.producerName,
      imageUrl: w.imageUrl || undefined,
      badge: w.color || "Wine",
    }));

    const producers: Item[] = (searchResults.producers || []).map((pr) => ({
      key: `producer-${pr.id}`,
      href: `/shop/${pr.handle}`,
      title: pr.name,
      subtitle: pr.region || undefined,
      imageUrl: pr.logoUrl || undefined,
      badge: "Producer",
    }));

    const flat: Item[] = [...users, ...wines, ...producers];

    return { users, wines, producers, flat };
  }, [searchResults]);

  const flattenedSearchItems = searchSectioned.flat;


  useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [searchOpen]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults({ users: [], wines: [], producers: [] });
      setSearchError(null);
      return;
    }

    const t = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (!res.ok) {
          setSearchError('Search failed');
          setSearchResults({ users: [], wines: [], producers: [] });
          return;
        }
        const data = await res.json();
        setSearchResults({
          users: Array.isArray(data.users) ? data.users : [],
          wines: Array.isArray(data.wines) ? data.wines : [],
          producers: Array.isArray(data.producers) ? data.producers : [],
        });
        setSearchActiveIndex(0);
      } catch {
        setSearchError('Search failed');
        setSearchResults({ users: [], wines: [], producers: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(t);
  }, [searchQuery, searchOpen]);



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

          // Refresh invitations when any change occurs
          fetchInvitations();

          // If an invitation was used, show toast and refresh IP
          if (payload.eventType === "UPDATE" && payload.new?.used_at) {
            toast.success("Your invite was just used! +1 IP awarded");
            fetchMembershipData();
            fetchIPEvents();
          }
        },
      )
      .subscribe();

    // Subscribe to IP events (for real-time activity feed)
    const ipEventsChannel = supabase
      .channel(`ip-events:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "impact_point_events",
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log("New IP event:", payload);

          // Refresh IP events, membership data, and progression buffs
          fetchIPEvents();
          fetchMembershipData();
          fetchProgressionBuffs(); // v2: check for new buffs
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(invitationChannel);
      supabase.removeChannel(ipEventsChannel);
    };
  }, [profile?.id]);

  // Followers/following counts (placeholder until API is wired)
  useEffect(() => {
    if (profile?.id) {
      setFollowersCount(0);
      setFollowingCount(0);
    }
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
      setEditForm({
            full_name: data.profile.full_name || "",
            phone: data.profile.phone || "",
            address: data.profile.address || "",
            city: data.profile.city || "",
            postal_code: data.profile.postal_code || "",
            country: data.profile.country || "Sweden",
          });
        }
      } else {
        setLoadError("Failed to load profile");
      }
    } catch (error) {
      setLoadError("Failed to load profile");
      console.error("Error fetching profile:", error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const res = await fetch("/api/user/follow/stats");
      if (res.ok) {
        const data = await res.json();
        setFollowersCount(data.followers || 0);
        setFollowingCount(data.following || 0);
      }
    } catch (error) {
      console.error("Error fetching follow stats:", error);
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

  const fetchIPEvents = async () => {
    try {
      const res = await fetch("/api/user/membership/events?limit=10");
      if (res.ok) {
        const data = await res.json();
        setIpEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching IP events:", error);
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

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/user/invitations");
      if (res.ok) {
        const data = await res.json();
        const all = [...(data.active || []), ...(data.used || [])];
        if (all.length > 0) {
          // Build signupUrl for each invitation if not present
          const enrichedInvitations = all.map((inv: any) => {
            if (inv.code && !inv.signupUrl) {
              const allowed = inv.allowed_types ?? (inv.invitation_type ? [inv.invitation_type] : ["consumer"]);
              inv.signupUrl = buildInviteUrl(inv.code, allowed);
              const baseUrl = getBaseUrlForInvite(allowed);
              const cleanCode = inv.code.trim().replace(/\s+/g, "");
              inv.codeSignupUrl = `${baseUrl}/c/${cleanCode}`;

              console.log("🔗 Built signup URL:", {
                code: inv.code,
                cleanCode,
                signupUrl: inv.signupUrl,
                hasSpace: inv.signupUrl.includes(" "),
              });
            }
            return inv;
          });

          setInvitations(enrichedInvitations);
        }
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      setLoadingSuggestions(true);
      // cache-bust so it can rotate over time
      const res = await fetch(`/api/user/suggestions?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const users = Array.isArray(data.users) ? data.users : [];
        // Safety: never show people you already follow
        const filtered = users.filter((u: any) => !u?.isFollowing);
        setSuggestedUsers(filtered);
        setSuggestionsError(null);
      } else {
        setSuggestionsError("Failed to load suggestions");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestionsError("Failed to load suggestions");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Refresh suggestions sometimes
  useEffect(() => {
    const id = window.setInterval(() => {
      fetchSuggestedUsers();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);


  // v2: Fetch progression buffs
  const fetchProgressionBuffs = async () => {
    try {
      const res = await fetch("/api/user/progression-buffs");
      if (res.ok) {
        const data = await res.json();
        setProgressionBuffs(data.buffs || []);
        setTotalBuffPercentage(data.totalPercentage || 0);

        // Check for Gold celebration (if just upgraded)
        if (membershipData) {
          const justUpgraded =
            localStorage.getItem("just_upgraded_to_gold") === "true";
          if (justUpgraded) {
            checkAndShowCelebration(membershipData.membership.level, true);
            localStorage.removeItem("just_upgraded_to_gold");
          }
        }
      }
    } catch (error) {
      console.error("Error fetching progression buffs:", error);
    }
  };

  const generateInvitation = async () => {
    setGeneratingInvite(true);
    try {
      // Check if user is admin to use admin endpoint with level selection
      const isAdmin = membershipData?.membership.level === "admin";
      const endpoint = isAdmin
        ? "/api/admin/invitations/generate"
        : "/api/invitations/generate";

      const body = isAdmin
        ? { expiresInDays: 30, initialLevel: selectedLevel }
        : { expiresInDays: 30 };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();

        // Add new invitation to the list
        setInvitations((prev) => [data.invitation, ...prev]);
        toast.success(
          `Invitation code generated!${isAdmin ? ` (Start level: ${selectedLevel})` : ""}`,
        );

        // Refresh membership data to update quota
        fetchMembershipData();
      } else {
        const error = await res.json();
        console.error("[PROFILE] Invitation generation failed:", {
          status: res.status,
          error,
          endpoint,
        });

        const errorMsg = error.details
          ? `${error.error}: ${error.details}`
          : error.error || "Failed to generate invitation";

        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error("Failed to generate invitation");
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyCode = () => {
    if (invitation?.code) {
      navigator.clipboard.writeText(invitation.code);
      setCopiedCode(true);
      toast.success("Code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyUrl = () => {
    if (invitation?.signupUrl) {
      navigator.clipboard.writeText(invitation.signupUrl);
      setCopiedUrl(true);
      toast.success("Link copied!");
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // handleAddPaymentMethod removed - using new payment flow

  const deleteInvitation = async (invitationId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this invitation? It will no longer be usable.",
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/user/invitations/${invitationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        toast.success("Invitation deleted");

        // Refresh membership data to update quota
        fetchMembershipData();
      } else {
        const error = await res.json();
        console.error("[PROFILE] Invitation deletion failed:", {
          status: res.status,
          error,
          invitationId,
        });

        const errorMsg = error.details
          ? `${error.error}: ${error.details}`
          : error.error || "Failed to delete invitation";

        toast.error(errorMsg);
      }
    } catch (error) {
      console.error("[PROFILE] Delete invitation exception:", error);
      toast.error("Failed to delete invitation");
    }
  };

  const saveProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        toast.success("Profile updated!");
        setEditing(false);
        fetchProfile();
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const resetsIn = getTimeUntilReset();

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

  const toggleFollowUser = async (targetId: string, currentlyFollowing: boolean) => {
    try {
      const res = await fetch("/api/user/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          action: currentlyFollowing ? "unfollow" : "follow",
        }),
      });
      if (res.ok) {
        // If you just followed someone, remove them from suggestions
        if (!currentlyFollowing) {
          setSuggestedUsers((prev) => prev.filter((u) => u.id !== targetId));
          // Pull in a fresh set so the list feels alive
          fetchSuggestedUsers();
        } else {
          // If you unfollowed via this UI (rare), keep them but mark as not-following
          setSuggestedUsers((prev) =>
            prev.map((u) => (u.id === targetId ? { ...u, isFollowing: false } : u)),
          );
        }
        // Update local counters if viewing own profile (simplistic)
        if (currentlyFollowing) {
          setFollowingCount((c) => Math.max(0, c - 1));
        } else {
          setFollowingCount((c) => c + 1);
        }
      } else {
        toast.error("Could not update follow");
      }
    } catch (error) {
      console.error("toggleFollowUser error", error);
      toast.error("Could not update follow");
    }
  };

  const handleSettings = () => {
    // Open existing settings modal
    setSettingsModalOpen(true);
  };

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

  const tabs = [
    { id: "reservations", label: "Reservations", count: reservations.length },
    { id: "activity", label: "Activity", count: undefined },
  ];



  return (
    <PageLayout>
      <div className="w-full max-w-7xl mx-auto p-4 md:p-sides">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(300px,360px)] gap-6 md:gap-8">
          <div className="space-y-6">
            {/* Social Profile Header - NEW DESIGN */}
            <SocialProfileHeader
              userId={profile.id}
              userName={userName}
              userHandle={profile?.handle}
              avatarUrl={avatarUrl}
              bio={profile?.description}
              joinedDate={joinedDate}
              followersCount={followersCount}
              followingCount={followingCount}
              isFollowing={isFollowing}
              isOwnProfile={true}
              onFollow={() => toggleFollowUser(profile.id, false)}
              onUnfollow={() => toggleFollowUser(profile.id, true)}
              onSettings={handleSettings}
              membershipLevel={membershipData.membership.level}
              membershipLabel={membershipData.levelInfo.name}
              suggestedUsers={suggestedUsers}
              suggestionsLoading={loadingSuggestions}
              suggestionsError={suggestionsError}
              onFollowSuggestedUser={(id) => toggleFollowUser(id, false)}
            />

            {/* Profile Tabs */}
            <div className="border-t border-border">
              <SocialProfileTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
                    </div>

            {/* Tab Content */}
            <div className="mt-6">
          {activeTab === "reservations" && (
            <div className="space-y-6">
              {/* MY RESERVATIONS (Compact) */}
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

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs">Active Orders</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.length}
                </p>
              </div>

                  <div className="p-4 bg-white rounded-xl border border-gray-200/50 shadow-sm col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Settings className="w-4 h-4" />
                      <span className="text-xs">Unique Pallets</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                        new Set(reservations.map((r) => r.pallet_id).filter(Boolean))
                          .size
                  }
                </p>
              </div>

              {/* Unique bottles (historical) */}
              <div className="col-span-2 md:col-span-3 rounded-xl border border-border bg-white p-4 shadow-sm">
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
                      const key = `${it.wine_name || ''}|${it.vintage || ''}|${it.producer_name || ''}`;
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
                    return (
                      <p className="text-sm text-muted-foreground">No bottles yet.</p>
                    );
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
                              <img
                                src={w.image_path}
                                alt={w.wine_name || 'Wine'}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                  </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {w.wine_name}{w.vintage ? ` ${w.vintage}` : ''}
                              </p>
                              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">
                                × {w.quantity}
                              </span>
                  </div>
                            <div className="mt-0.5 flex items-center justify-between gap-3">
                              <p className="truncate text-xs text-muted-foreground">
                                {w.producer_name || 'Unknown producer'}
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
                    </div>
              </section>

                    </div>
                  )}
                  
          {activeTab === "activity" && (
                <div className="space-y-4">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
                    Recent Activity
                  </h2>
                  {ipEvents.length > 0 && (
                    <Link
                      href="/profile/activity"
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      View all
                    </Link>
                  )}
                      </div>
                <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
                  <IPTimeline events={ipEvents} />
                    </div>
              </section>

              {/* Reservation Details */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recent reservations
                  </h3>
                  {reservations.length > 0 && (
                    <Link
                      href="/profile/reservations"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      View all
                    </Link>
                  )}
                      </div>
                {reservations.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    You have no reservations yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reservations.slice(0, 5).map((r: any) => {
                      const totalBottles =
                    r.items?.reduce(
                          (sum: number, item: any) => sum + (item.quantity || 0),
                      0,
                    ) || 0;
                      const capacity = r.pallet_capacity || 0;
                      const percentFull =
                        capacity > 0
                          ? Math.min(
                              100,
                              Math.round((totalBottles / capacity) * 100),
                            )
                          : undefined;
                  return (
                        <div
                          key={r.id || r.order_id}
                          className="rounded-xl border border-border bg-card p-3 shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {r.pallet_name || "Reservation"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {totalBottles} bottles
                                {capacity ? ` • ${capacity} capacity` : ""}
                              </p>
                    </div>
                            <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
                              {r.payment_status || r.status || "pending"}
                            </span>
                      </div>
                          {percentFull !== undefined && (
                            <div className="mt-2">
                              <div className="h-1.5 w-full rounded-full bg-muted">
                                <div
                                  className="h-1.5 rounded-full bg-primary"
                                  style={{ width: `${percentFull}%` }}
                                />
                </div>
                              <div className="mt-1 text-[11px] text-muted-foreground">
                                {percentFull}% full
                    </div>
                      </div>
                  )}
                </div>
                );
                    })}
                    </div>
                  )}
              </section>
                    </div>
                )}
              </div>
                </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Search */}
            <div ref={searchWrapRef} className="relative rounded-xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 bg-white">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchOpen(false);
                      return;
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setSearchOpen(true);
                      setSearchActiveIndex((i) =>
                        Math.min(flattenedSearchItems.length - 1, i + 1),
                      );
                      return;
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setSearchActiveIndex((i) => Math.max(0, i - 1));
                      return;
                    }
                    if (e.key === "Enter") {
                      const item = flattenedSearchItems[searchActiveIndex];
                      if (item) {
                        e.preventDefault();
                        setSearchOpen(false);
                        router.push(item.href);
                      }
                    }
                  }}
                  type="text"
                  placeholder="Search users, wines, producers"
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
              </div>

              {searchOpen && searchQuery.trim().length >= 2 && (
                <div className="absolute left-4 right-4 top-[calc(100%-8px)] z-50 mt-2 overflow-hidden rounded-xl border border-border bg-white shadow-lg">
                  <div className="max-h-[380px] overflow-auto py-2">
                    {searchLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Searching...
                      </div>
                    ) : searchError ? (
                      <div className="px-3 py-2 text-xs text-red-600">
                        {searchError}
                      </div>
                    ) : flattenedSearchItems.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        No results.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          let cursor = 0;

                          const renderSection = (
                            label: string,
                            items: typeof searchSectioned.users,
                          ) => {
                            if (!items || items.length === 0) return null;
                            const startIndex = cursor;
                            cursor += items.length;

                  return (
                              <div className="px-2">
                                <div className="px-2 pb-1 pt-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                                  {label}
                                </div>
                                <div className="space-y-1">
                                  {items.map((item, localIdx) => {
                                    const idx = startIndex + localIdx;
                  return (
                                      <Link
                                        key={item.key}
                                        href={item.href}
                                        onClick={() => setSearchOpen(false)}
                                        className={`flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30 ${
                                          idx === searchActiveIndex
                                            ? "bg-muted/30"
                                            : ""
                                        }`}
                                      >
                                        <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                                          {item.imageUrl ? (
                                            <Image
                                              src={item.imageUrl}
                                              alt={item.title}
                                              fill
                                              sizes="36px"
                                              className="object-cover"
                                            />
                                          ) : null}
                      </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-semibold text-foreground">
                                              {item.title}
                                            </p>
                                            {item.badge ? (
                                              <span className="shrink-0 whitespace-nowrap rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                                                {item.badge}
                                              </span>
                                            ) : null}
                                          </div>
                                          {item.subtitle ? (
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                              {item.subtitle}
                                            </p>
                                          ) : null}
                    </div>
                                      </Link>
                                    );
                                  })}
                      </div>
                </div>
                  );
                          };

                          const sections = [
                            renderSection("Users", searchSectioned.users),
                            renderSection("Wines", searchSectioned.wines),
                            renderSection("Producers", searchSectioned.producers),
                          ].filter(Boolean);

                return (
                            <div className="divide-y divide-border">
                              {sections}
                </div>
                );
              })()}
          </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            {/* Suggestions (desktop/sidebar) */}
            <div className="hidden lg:block rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Other PACTers to follow
                </h3>
                <Link
                  href="/profile/suggestions"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline underline-offset-4"
                >
                  Show all
                </Link>
              </div>
              <div className="space-y-1">
                {loadingSuggestions && (
                  <div className="px-2 py-2 text-xs text-muted-foreground">Loading...</div>
                )}
                {suggestionsError && (
                  <div className="px-2 py-2 text-xs text-red-600">{suggestionsError}</div>
                )}
                {!loadingSuggestions &&
                  !suggestionsError &&
                  suggestedUsers.length === 0 && (
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No suggestions right now.
                  </div>
                )}

                {suggestedUsers.map((u) => {
                  const avatarUrl = u.avatar_image_path
                    ? u.avatar_image_path.startsWith("http")
                      ? u.avatar_image_path
                      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${u.avatar_image_path}`
                    : undefined;

                  return (
                    <div
                      key={u.id}
                      className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={avatarUrl} alt={u.full_name || "User"} />
                          <AvatarFallback className="text-xs">
                            {u.full_name
                              ? u.full_name
                                  .split(" ")
                                  .map((n: string) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            href={`/profile/${u.id}`}
                            className="block truncate text-sm font-semibold text-foreground hover:underline"
                          >
                            {u.full_name || "User"}
                          </Link>
                          {u.description ? (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                              {u.description}
                            </p>
                          ) : null}
                            </div>
                          </div>

                          <Button
                            size="sm"
                        className="rounded-full bg-black text-white hover:bg-white hover:text-black hover:border-black"
                        onClick={() => toggleFollowUser(u.id, false)}
                          >
                        Follow
                          </Button>
                        </div>
                  );
                })}
                      </div>
                  </div>

            {/* Last Viewed */}
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Last Viewed</h3>
              <div className="space-y-2">
                {lastViewedProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recently viewed wines yet.
                  </p>
                ) : (
                  lastViewedProducts.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.handle}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.title}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : null}
                        </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {p.title}
                          </p>
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
