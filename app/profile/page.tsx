"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  LogOut,
  UserPlus,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Calendar,
  Package,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
// PaymentMethodCard removed - using new payment flow
import { MiniProgress } from "@/components/ui/progress-components";
import { getTimeUntilReset } from "@/lib/membership/invite-quota";
import { MembershipLevel } from "@/lib/membership/points-engine";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ProfileSection } from "@/components/profile/profile-section";
import { FollowModal } from "@/components/profile/follow-modal";
import type { SharedBoxMeta } from "@/lib/shopify/types";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

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

type LightweightProfile = {
  id: string;
  full_name?: string;
  email?: string;
};

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(
    null,
  );
  const [ipEvents, setIpEvents] = useState<any[]>([]);
  // Payment methods removed - using new payment flow
  const [reservations, setReservations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [connections, setConnections] = useState<{
    followers: LightweightProfile[];
    following: LightweightProfile[];
  }>({ followers: [], following: [] });
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [sharedBoxes, setSharedBoxes] = useState<SharedBoxMeta[]>([]);
  const [sharedBoxesLoading, setSharedBoxesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
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

  // v2: Gold celebration hook
  const { showCelebration, checkAndShowCelebration, closeCelebration } =
    useGoldCelebration();

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
      fetchConnections(),
      fetchSharedBoxes(),
    ]).finally(() => setLoading(false));

    // Payment method setup check removed - using new payment flow
  }, []);

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

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
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
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
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

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/profile/follow");
      if (!res.ok) return;
      const data = await res.json();
      setConnections({
        followers: data.followers ?? [],
        following: data.following ?? [],
      });
    } catch (error) {
      console.error("Error fetching connections:", error);
    }
  };

  const fetchSharedBoxes = async () => {
    try {
      setSharedBoxesLoading(true);
      const res = await fetch("/api/shared-boxes");
      if (res.ok) {
        const data = await res.json();
        setSharedBoxes(data.boxes ?? []);
      }
    } catch (error) {
      console.error("Error fetching shared boxes:", error);
      setSharedBoxes([]);
    } finally {
      setSharedBoxesLoading(false);
    }
  };

  const handleFollowUser = async (targetUserId: string) => {
    try {
      const res = await fetch("/api/profile/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (res.ok) {
        fetchConnections();
        toast.success("Following member");
        AnalyticsTracker.trackFollowAction("follow", targetUserId);
      }
    } catch (error) {
      console.error("Follow user error:", error);
      toast.error("Could not follow member");
    }
  };

  const handleUnfollowUser = async (targetUserId: string) => {
    try {
      const res = await fetch(
        `/api/profile/follow?target=${encodeURIComponent(targetUserId)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        fetchConnections();
        toast("Removed from following");
        AnalyticsTracker.trackFollowAction("unfollow", targetUserId);
      }
    } catch (error) {
      console.error("Unfollow user error:", error);
      toast.error("Could not update following");
    }
  };

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

  const handleSignOut = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Signed out successfully");
        window.location.href = "/";
      } else {
        toast.error("Failed to sign out");
      }
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

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
  const totalReservedBottles = reservations.reduce((sum, reservation) => {
    const itemCount = Array.isArray(reservation.items)
      ? reservation.items.reduce(
          (acc: number, item: any) => acc + (item?.quantity || 0),
          0,
        )
      : 0;
    const fallbackCount = reservation.quantity || 0;
    return sum + (itemCount > 0 ? itemCount : fallbackCount);
  }, 0);

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
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

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl space-y-8 px-sides py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur md:p-10">
            <div className="flex flex-col items-center gap-8 md:flex-row">
              <LevelBadge
                level={membershipData.membership.level}
                size="xl"
                showLabel={false}
              />
              <div className="w-full flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h1 className="text-3xl md:text-4xl font-light text-gray-900">
                    {membershipData.levelInfo.name}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Member since{" "}
                    {new Date(
                      membershipData.membership.levelAssignedAt,
                    ).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-baseline justify-center gap-2 md:justify-start">
                  <span className="text-5xl font-bold text-gray-900">
                    {membershipData.membership.impactPoints}
                  </span>
                  <span className="text-lg font-light text-gray-500">
                    Impact Points
                  </span>
                </div>
                {membershipData.nextLevel ? (
                  <LevelProgress
                    currentPoints={membershipData.membership.impactPoints}
                    currentLevelMin={membershipData.levelInfo.minPoints}
                    nextLevelMin={membershipData.nextLevel.minPoints}
                    nextLevelName={membershipData.nextLevel.name}
                    activeBuffPercentage={totalBuffPercentage}
                  />
                ) : (
                  membershipData.membership.level !== "admin" && (
                    <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 p-4">
                      <p className="text-sm font-medium text-yellow-900">
                        🏆 Maximum level reached!
                      </p>
                      <p className="mt-1 text-xs text-yellow-700">
                        You&apos;ve achieved the highest membership tier
                      </p>
                    </div>
                  )
                )}
                <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full border-gray-200 text-gray-900 hover:border-gray-300"
                  >
                    <Link href="#perks">View perks</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-full bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <Link href="#invite">Invite friend</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <ProfileSection
            id="reservations"
            title="Reservation snapshot"
            description="Quick glance at your current activity."
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <Package className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    Total bottles
                  </span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {totalReservedBottles}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/60 bg-white/80 p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    Active orders
                  </span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {reservations.length}
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-gray-200/60 bg-white/80 p-4 shadow-sm md:col-span-1">
                <div className="mb-2 flex items-center gap-2 text-gray-400">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs uppercase tracking-wide">
                    Unique pallets
                  </span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {
                    new Set(
                      reservations.map((r) => r.pallet_id).filter(Boolean),
                    ).size
                  }
                </p>
              </div>
            </div>
            <Link href="/profile/reservations">
              <Button className="mt-4 w-full rounded-2xl bg-gray-900 text-white hover:bg-gray-800">
                View reservations
              </Button>
            </Link>
          </ProfileSection>
        </div>

        {progressionBuffs.length > 0 && (
          <ProfileSection
            title="Progression boosts"
            description="Active multipliers applied to your upcoming activity."
          >
            <ProgressionBuffDisplay
              totalBuffPercentage={totalBuffPercentage}
              buffDetails={progressionBuffs.map((buff) => ({
                percentage: buff.buff_percentage,
                description: buff.buff_description,
                earnedAt: buff.earned_at,
              }))}
              expiresOnUse
            />
          </ProfileSection>
        )}

        {/* TWO COLUMN LAYOUT */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-6">
          {/* Personal Information */}
          <ProfileSection
            title="Personal information"
            actions={
              !editing ? (
          <Button 
                  onClick={() => setEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditing(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
          </Button>
                </div>
              )
            }
          >
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label
                      htmlFor="full_name"
                      className="text-xs text-gray-600"
                    >
                      Full Name
                    </Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) =>
                        setEditForm({ ...editForm, full_name: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-gray-600">
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-xs text-gray-600">
                      Address
                    </Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="city" className="text-xs text-gray-600">
                        City
                      </Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) =>
                          setEditForm({ ...editForm, city: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="postal_code"
                        className="text-xs text-gray-600"
                      >
                        Postal Code
                      </Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            postal_code: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-400 mb-3">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs">Email</span>
                    </div>
                  <p className="text-sm text-gray-900 -mt-2">{profile.email}</p>
                  
                  {profile.full_name && (
                      <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <User className="w-3 h-3" />
                        <span className="text-xs">Full Name</span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {profile.full_name}
                      </p>
                    </div>
                  )}
                  
                  {profile.phone && (
                      <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Phone className="w-3 h-3" />
                        <span className="text-xs">Phone</span>
                      </div>
                      <p className="text-sm text-gray-900">{profile.phone}</p>
                    </div>
                  )}
                  
                  {(profile.address || profile.city) && (
                      <div>
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-xs">Address</span>
                      </div>
                      <p className="text-sm text-gray-900">
                        {[
                          profile.address,
                          profile.city,
                          profile.postal_code,
                          profile.country,
                        ]
                            .filter(Boolean)
                          .join(", ")}
                        </p>
                      </div>
                  )}
                    </div>
                  )}
          </ProfileSection>

          {/* Payment Information */}
          <ProfileSection
            title="Orders & payments"
            description="We’ll notify you once a pallet is ready to pay."
          >
              {(() => {
                // Debug logging
                console.log("All reservations:", reservations);
                console.log(
                  "Reservations with status:",
                  reservations.map((r) => ({
                    id: r.id,
                    status: r.status,
                    payment_status: r.payment_status,
                  })),
                );

                const pendingPaymentReservations = reservations.filter((r) => {
                  // Count bottles in this reservation
                  const reservationBottles =
                    r.items?.reduce(
                      (total: number, item: any) =>
                        total + (item.quantity || 0),
                      0,
                    ) || 0;

                  // Only show payment required if pallet is actually full (not incorrectly marked)
                  return (
                    (r.payment_status === "pending" ||
                      r.status === "pending_payment") &&
                    r.pallet_is_complete === true &&
                    r.pallet_capacity &&
                    r.pallet_capacity > 0 &&
                    reservationBottles >= 50
                  ); // Safety threshold
                });

                console.log(
                  "Pending payment reservations:",
                  pendingPaymentReservations.length,
                );

                // Check for 90% warning reservations
                const nearlyFullReservations = reservations.filter((r) => {
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
                    r.pallet_capacity > 0 &&
                    r.status !== "pending_payment"
                  );
                });

                console.log(
                  "Nearly full reservations (90%+):",
                  nearlyFullReservations.length,
                );

                if (pendingPaymentReservations.length > 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <CreditCard className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        ⚠️ Payment Required
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        You have {pendingPaymentReservations.length} reservation
                        {pendingPaymentReservations.length !== 1 ? "s" : ""}{" "}
                        ready for payment
                      </p>
                      <p className="text-sm text-gray-500 mb-6">
                        Your pallet has reached 100% capacity. Complete payment
                        to secure your order.
                      </p>
                      <Link href="/profile/reservations">
                        <Button className="rounded-full px-8 bg-amber-600 hover:bg-amber-700 text-white">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now ({pendingPaymentReservations.length})
                        </Button>
                      </Link>
                    </div>
                  );
                }

                if (nearlyFullReservations.length > 0) {
                  return (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        ⚠️ Pallet Nearly Full
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        You have {nearlyFullReservations.length} pallet
                        {nearlyFullReservations.length !== 1 ? "s" : ""} that
                        are 90%+ full
                      </p>
                      <p className="text-sm text-gray-500 mb-6">
                        Your pallet is getting close to capacity. Payment will
                        be required once it reaches 100%.
                      </p>
                      <Link href="/profile/reservations">
                        <Button className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 text-white">
                          <Package className="w-4 h-4 mr-2" />
                          View Reservations ({nearlyFullReservations.length})
                  </Button>
                      </Link>
                </div>
                  );
                }

                return (
                <div className="text-center py-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-green-100">
                      <CreditCard className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="mb-1 text-lg font-light text-gray-900">
                      No payment required yet
                    </h3>
                    <p className="mb-6 text-sm text-gray-500">
                      You&apos;ll only pay when your pallet reaches 100% and is
                      ready to ship. Check your reservations page for status.
                    </p>
                    <Link href="/profile/reservations">
                      <Button className="rounded-full bg-gray-900 px-8 text-white hover:bg-gray-800">
                        <Package className="mr-2 h-4 w-4" />
                        View reservations
                  </Button>
                    </Link>
                </div>
                );
              })()}
          </ProfileSection>
          </div>

          <div className="space-y-6">
            <ProfileSection
              id="connections"
              title="Connections"
              description="Follow members to collaborate on shared boxes."
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-gray-200 text-gray-700"
                  onClick={() => setFollowModalOpen(true)}
                >
                  Manage
                </Button>
              }
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Followers
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {connections.followers.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Following
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {connections.following.length}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {connections.following.slice(0, 4).map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between rounded-xl border border-gray-200/70 bg-white/70 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {person.full_name || person.email}
                      </p>
                      {person.email && (
                        <p className="text-xs text-gray-500">{person.email}</p>
                      )}
                    </div>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-gray-500 hover:text-gray-900"
                      onClick={() => handleUnfollowUser(person.id)}
                    >
                      Unfollow
                    </Button>
                  </div>
                ))}
                {connections.following.length === 0 && (
                  <p className="text-xs text-gray-500">
                    You&apos;re not following anyone yet.
                  </p>
                )}
              </div>
            </ProfileSection>

            <ProfileSection
              id="perks"
              title="Your perks"
              description="Benefits currently unlocked at your level."
            >
              {membershipData.perks.length > 0 ? (
                <PerksGrid perks={membershipData.perks} />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
                  Perks will appear here as soon as you start unlocking them.
                </div>
              )}
            </ProfileSection>

            <ProfileSection
              id="invite"
              title="Invite friends"
              description="Share PACT and earn Impact Points."
            >
              <div className="space-y-6">
                <InviteQuotaDisplay
                  available={membershipData.invites.available}
                  total={membershipData.invites.total}
                  used={membershipData.invites.used}
                  resetsIn={resetsIn}
                />
                {resetsIn && (
                  <p className="text-center text-xs text-gray-500">
                    Quota resets in {resetsIn.days}d {resetsIn.hours}h
                  </p>
                )}
                {membershipData.membership.level === "admin" ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">
                      Start level for new invite
                    </Label>
                    <Select
                      value={selectedLevel}
                      onValueChange={(val) =>
                        setSelectedLevel(val as MembershipLevel)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (0-4 IP)</SelectItem>
                        <SelectItem value="brons">
                          Bronze (5-14 IP)
                        </SelectItem>
                        <SelectItem value="silver">
                          Silver (15-34 IP)
                        </SelectItem>
                        <SelectItem value="guld">Gold (35+ IP)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      Choose which level the invitee will start at.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                    <strong>Your invitations start at Basic level.</strong> When
                    your friends join and earn Impact Points, they&apos;ll
                    progress naturally.
                  </div>
                )}

                <Button
                  onClick={generateInvitation}
                  disabled={
                    generatingInvite || membershipData.invites.available === 0
                  }
                  className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800"
                >
                  {generatingInvite ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {membershipData.membership.level === "admin"
                    ? `Generate ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} invite`
                    : "Generate Basic invite"}
                </Button>

                {invitations.length > 0 && (
                  <div className="space-y-3 border-t border-gray-200/60 pt-4">
                    <h3 className="text-sm font-medium text-gray-700">
                      Active invitations
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {invitations.length}
                      </span>
                    </h3>
                    {invitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="space-y-3 rounded-xl border border-gray-200/60 bg-white/70 p-4"
                      >
                        {inv.initialLevel && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="rounded-md bg-blue-100 px-2 py-1 font-medium text-blue-800">
                              {inv.initialLevel.charAt(0).toUpperCase() +
                                inv.initialLevel.slice(1)}{" "}
                              level
                            </span>
                            <span>
                              Created{" "}
                              {new Date(inv.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">Code</p>
                            <code className="font-mono text-sm font-semibold text-gray-900">
                              {inv.code}
                            </code>
                          </div>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(inv.code);
                              toast.success("Code copied!");
                            }}
                            size="sm"
                            variant="ghost"
                            className="h-8"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {inv.signupUrl && (
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                              <p className="text-xs text-gray-500">Link</p>
                              <p className="truncate font-mono text-xs text-gray-900">
                                {inv.signupUrl}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(inv.signupUrl);
                                toast.success("Link copied!");
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-8"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t border-gray-200/60 pt-2">
                          <span className="text-xs text-gray-500">
                            Expires{" "}
                            {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                          <Button
                            onClick={() => deleteInvitation(inv.id)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {invitations.length === 0 && (
                  <div className="rounded-xl border border-dashed border-gray-200/70 bg-gray-50/60 p-4 text-sm text-gray-500">
                    You don&apos;t have any active invitations yet. Generate one
                    to share PACT with a friend.
                  </div>
                )}
              </div>
            </ProfileSection>

            <ProfileSection
              title="Shared boxes"
              description="Track collaborative cases before they are full."
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-500 hover:text-gray-900"
                  onClick={fetchSharedBoxes}
                >
                  Refresh
                </Button>
              }
            >
              {sharedBoxesLoading ? (
                <p className="text-sm text-gray-500">Loading shared boxes…</p>
              ) : sharedBoxes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200/70 bg-gray-50/60 p-5 text-center text-sm text-gray-500">
                  Start a shared box from any product to split the 6-bottle
                  minimum with friends.
                </div>
              ) : (
                <div className="space-y-3">
                  {sharedBoxes.slice(0, 4).map((box) => {
                    const progress = Math.min(
                      100,
                      Math.round(
                        (box.totalQuantity / box.targetQuantity) * 100,
                      ),
                    );
                    return (
                      <div
                        key={box.id}
                        className="rounded-2xl border border-gray-200/70 bg-white/80 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {box.producerName || "Shared box"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {box.totalQuantity}/{box.targetQuantity} bottles
                              committed
                            </p>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {box.status}
                          </Badge>
                        </div>
                        <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-gray-900"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {box.remainingQuantity > 0
                            ? `${box.remainingQuantity} bottles left`
                            : "Ready for checkout"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button
                asChild
                variant="outline"
                className="mt-4 w-full rounded-full border-gray-200 text-gray-700"
              >
                <Link href="/profile/reservations">View all reservations</Link>
              </Button>
            </ProfileSection>
          </div>
        </div>

        <ProfileSection
          title="Recent activity"
          actions={
            ipEvents.length > 0 ? (
              <Link
                href="/profile/activity"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                View all
              </Link>
            ) : undefined
          }
        >
          {ipEvents.length > 0 ? (
            <IPTimeline events={ipEvents} />
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200/70 bg-gray-50/60 p-6 text-center text-sm text-gray-500">
              You haven&apos;t earned any Impact Points yet. Your recent activity
              will appear here.
            </div>
          )}
        </ProfileSection>

        {/* Account Actions */}
        <section className="pt-6 border-t border-gray-200">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </div>

      <FollowModal
        open={followModalOpen}
        onOpenChange={setFollowModalOpen}
        following={connections.following}
        onFollow={handleFollowUser}
        onUnfollow={handleUnfollowUser}
      />

      {/* Gold Celebration Modal (v2) */}
      <GoldCelebration
        show={showCelebration}
        onClose={closeCelebration}
        userName={profile?.full_name}
      />
    </PageLayout>
  );
}
