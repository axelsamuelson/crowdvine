"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { SocialProfileHeader } from "@/components/profile/social-profile-header";
import { SocialProfileTabs } from "@/components/profile/social-profile-tabs";
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
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
// PaymentMethodCard removed - using new payment flow
import { MiniProgress } from "@/components/ui/progress-components";
import { getTimeUntilReset } from "@/lib/membership/invite-quota";
import { MembershipLevel } from "@/lib/membership/points-engine";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/shopify/utils";
import { useB2B } from "@/lib/context/b2b-context";

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

export default function ProfilePage() {
  const router = useRouter();
  const { isB2BMode } = useB2B();

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
    // Business fields
    company_name: "",
    organization_number: "",
    vat_number: "",
    business_type: "",
    billing_address: "",
    billing_city: "",
    billing_postal_code: "",
    billing_country: "Sweden",
    contact_person: "",
    delivery_instructions: "",
    opening_hours: "",
    employee_count: undefined as number | undefined,
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
            // Business fields
            company_name: data.profile.company_name || "",
            organization_number: data.profile.organization_number || "",
            vat_number: data.profile.vat_number || "",
            business_type: data.profile.business_type || "",
            billing_address: data.profile.billing_address || "",
            billing_city: data.profile.billing_city || "",
            billing_postal_code: data.profile.billing_postal_code || "",
            billing_country: data.profile.billing_country || "Sweden",
            contact_person: data.profile.contact_person || "",
            delivery_instructions: data.profile.delivery_instructions || "",
            opening_hours: data.profile.opening_hours || "",
            employee_count: data.profile.employee_count || undefined,
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
        if (data.invitations) {
          // Build signupUrl for each invitation if not present
          const enrichedInvitations = data.invitations.map((inv: any) => {
            if (inv.code && !inv.signupUrl) {
              const baseUrl = window.location.origin;
              // Remove any whitespace from code and ensure no spaces in URL
              const cleanCode = inv.code.trim().replace(/\s+/g, "");
              inv.signupUrl = `${baseUrl}/i/${cleanCode}`;
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
        const data = await res.json();
        setProfile(data.profile);
        toast.success("Profile updated!");
        setEditing(false);
        // Reload profile data
        fetchProfile();
      } else {
        let errorMessage = "Failed to update profile";
        try {
          const errorData = await res.json();
          errorMessage = errorData.details || errorData.error || errorMessage;
          console.error("Profile update error:", errorData);
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Profile update exception:", error);
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
    { id: "tastings", label: "Tastings", count: tastingsCount },
    { id: "activity", label: "Activity", count: undefined },
  ];



  // B2B Profile View
  if (isB2BMode) {
    return (
      <PageLayout>
        <div className="w-full max-w-7xl mx-auto p-4 md:p-sides">
          <div className="space-y-6">
            {/* B2B Profile Header */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                    Business Profile
                  </h1>
                  <p className="text-sm text-gray-500">
                    Manage your business account and orders
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(!editing)}
                >
                  {editing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>

              {!editing ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Company Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Company Name</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.company_name || profile?.full_name || "Not set"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Business Type</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.business_type || "Not set"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Organization Number</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.organization_number || "Not set"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">VAT Number</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.vat_number || "Not set"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Contact Person</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.contact_person || "Not set"}
                        </p>
                      </div>
                      {profile?.employee_count && (
                        <div>
                          <Label className="text-xs text-gray-500 mb-1">Number of Employees</Label>
                          <p className="text-sm font-medium text-gray-900">
                            {profile.employee_count}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Email</Label>
                        <p className="text-sm font-medium text-gray-900">
                          {profile?.email}
                        </p>
                      </div>
                      {profile?.phone && (
                        <div>
                          <Label className="text-xs text-gray-500 mb-1">Phone</Label>
                          <p className="text-sm font-medium text-gray-900">
                            {profile.phone}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {(profile?.address || profile?.city) && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-gray-500 mb-1">Address</Label>
                          <p className="text-sm font-medium text-gray-900">
                            {[profile.address, profile.city, profile.postal_code, profile.country]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Billing Address */}
                  {(profile?.billing_address || profile?.billing_city) && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Billing Address</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label className="text-xs text-gray-500 mb-1">Billing Address</Label>
                          <p className="text-sm font-medium text-gray-900">
                            {[profile.billing_address, profile.billing_city, profile.billing_postal_code, profile.billing_country]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  {(profile?.opening_hours || profile?.delivery_instructions) && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Information</h3>
                      <div className="space-y-4">
                        {profile?.opening_hours && (
                          <div>
                            <Label className="text-xs text-gray-500 mb-1">Opening Hours</Label>
                            <p className="text-sm font-medium text-gray-900 whitespace-pre-line">
                              {profile.opening_hours}
                            </p>
                          </div>
                        )}
                        {profile?.delivery_instructions && (
                          <div>
                            <Label className="text-xs text-gray-500 mb-1">Delivery Instructions</Label>
                            <p className="text-sm font-medium text-gray-900 whitespace-pre-line">
                              {profile.delivery_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Edit Mode */
                <div className="space-y-6">
                  {/* Company Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="company_name">Company Name *</Label>
                        <Input
                          id="company_name"
                          value={editForm.company_name}
                          onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                          placeholder="Restaurant Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_type">Business Type</Label>
                        <Select
                          value={editForm.business_type}
                          onValueChange={(value) => setEditForm({ ...editForm, business_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="wine_bar">Wine Bar</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="hotel">Hotel</SelectItem>
                            <SelectItem value="catering">Catering</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="organization_number">Organization Number</Label>
                        <Input
                          id="organization_number"
                          value={editForm.organization_number}
                          onChange={(e) => setEditForm({ ...editForm, organization_number: e.target.value })}
                          placeholder="123456-7890"
                        />
                      </div>
                      <div>
                        <Label htmlFor="vat_number">VAT Number</Label>
                        <Input
                          id="vat_number"
                          value={editForm.vat_number}
                          onChange={(e) => setEditForm({ ...editForm, vat_number: e.target.value })}
                          placeholder="SE123456789001"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_person">Contact Person</Label>
                        <Input
                          id="contact_person"
                          value={editForm.contact_person}
                          onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <Label htmlFor="employee_count">Number of Employees</Label>
                        <Input
                          id="employee_count"
                          type="number"
                          value={editForm.employee_count || ""}
                          onChange={(e) => setEditForm({ ...editForm, employee_count: e.target.value ? parseInt(e.target.value) : undefined })}
                          placeholder="10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="+46 70 123 45 67"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Delivery Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          placeholder="Street name and number"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="Stockholm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal_code">Postal Code</Label>
                        <Input
                          id="postal_code"
                          value={editForm.postal_code}
                          onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                          placeholder="123 45"
                        />
                      </div>
                      <div>
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          value={editForm.country}
                          onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                          placeholder="Sweden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Billing Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="billing_address">Billing Street Address</Label>
                        <Input
                          id="billing_address"
                          value={editForm.billing_address}
                          onChange={(e) => setEditForm({ ...editForm, billing_address: e.target.value })}
                          placeholder="Leave empty to use delivery address"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_city">Billing City</Label>
                        <Input
                          id="billing_city"
                          value={editForm.billing_city}
                          onChange={(e) => setEditForm({ ...editForm, billing_city: e.target.value })}
                          placeholder="Stockholm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_postal_code">Billing Postal Code</Label>
                        <Input
                          id="billing_postal_code"
                          value={editForm.billing_postal_code}
                          onChange={(e) => setEditForm({ ...editForm, billing_postal_code: e.target.value })}
                          placeholder="123 45"
                        />
                      </div>
                      <div>
                        <Label htmlFor="billing_country">Billing Country</Label>
                        <Input
                          id="billing_country"
                          value={editForm.billing_country}
                          onChange={(e) => setEditForm({ ...editForm, billing_country: e.target.value })}
                          placeholder="Sweden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="opening_hours">Opening Hours</Label>
                        <Input
                          id="opening_hours"
                          value={editForm.opening_hours}
                          onChange={(e) => setEditForm({ ...editForm, opening_hours: e.target.value })}
                          placeholder="Mon-Fri: 10:00-22:00, Sat-Sun: 12:00-24:00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery_instructions">Delivery Instructions</Label>
                        <textarea
                          id="delivery_instructions"
                          value={editForm.delivery_instructions}
                          onChange={(e) => setEditForm({ ...editForm, delivery_instructions: e.target.value })}
                          placeholder="Special instructions for deliveries..."
                          className="w-full min-h-[100px] px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={saveProfile}
                      className="bg-gray-900 text-white hover:bg-gray-800"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* B2B Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Package className="w-4 h-4" />
                  <span className="text-xs">Total Orders</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.length}
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Package className="w-4 h-4" />
                  <span className="text-xs">Total Bottles</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.reduce(
                    (sum, r) =>
                      sum +
                      ((r.items || []).reduce(
                        (s: number, it: any) => s + (it.quantity || 0),
                        0,
                      )),
                    0,
                  )}
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">Active Pallets</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    new Set(
                      reservations.map((r) => r.pallet_id).filter(Boolean),
                    ).size
                  }
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <CreditCard className="w-4 h-4" />
                  <span className="text-xs">Pending Payment</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.filter(
                    (r) => r.payment_status === "pending",
                  ).length}
                </p>
              </div>
            </div>

            {/* B2B Orders/Reservations */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Order History
                </h2>
                {reservations.length > 0 && (
                  <Link
                    href="/profile/reservations"
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    View all
                  </Link>
                )}
              </div>
              {reservations.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-8">
                  No orders yet. Start shopping to see your order history here.
                </div>
              ) : (
                <div className="space-y-3">
                  {reservations.slice(0, 10).map((r: any) => {
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
                        className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {r.pallet_name || "Order"}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {totalBottles} bottles
                              {capacity ? ` • ${capacity} capacity` : ""}
                              {r.created_at && (
                                <> • {new Date(r.created_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                          <span className="text-xs rounded-full border px-3 py-1 text-gray-700 bg-gray-50 whitespace-nowrap">
                            {r.payment_status || r.status || "pending"}
                          </span>
                        </div>
                        {percentFull !== undefined && (
                          <div className="mt-3">
                            <div className="h-2 w-full rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-gray-900"
                                style={{ width: `${percentFull}%` }}
                              />
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {percentFull}% full
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Private Profile View (existing)
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
          {activeTab === "tastings" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
                  My Tastings
                </h2>
                <Link
                  href="/profile/tastings"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  View all
                </Link>
              </div>
              <div className="bg-white rounded-xl border border-gray-200/50 p-6 shadow-sm">
                <p className="text-center text-gray-500 mb-4">
                  {tastingsCount === 0
                    ? "No tasting sessions yet"
                    : `${tastingsCount} tasting session${tastingsCount !== 1 ? "s" : ""}`}
                </p>
                <Link href="/profile/tastings">
                  <Button variant="outline" className="w-full">
                    View Tasting History
                  </Button>
                </Link>
              </div>
            </div>
          )}
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
                  const displayAvatarUrl =
                    avatarUrl ||
                    "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/1f464.svg";

                  return (
                    <div
                      key={u.id}
                      className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={displayAvatarUrl} alt={u.full_name || "User"} />
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
