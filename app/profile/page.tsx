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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipData, setMembershipData] = useState<MembershipData | null>(
    null,
  );
  const [ipEvents, setIpEvents] = useState<any[]>([]);
  // Payment methods removed - using new payment flow
  const [reservations, setReservations] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
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
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 lg:space-y-12 p-sides">
        {/* MEMBERSHIP STATUS HERO */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 md:p-10 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Level Badge */}
            <LevelBadge
              level={membershipData.membership.level}
              size="xl"
              showLabel={false}
            />

            {/* Membership Info */}
            <div className="flex-1 text-center md:text-left space-y-4 w-full">
            <div>
                <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-1">
                  {membershipData.levelInfo.name}
              </h1>
                <p className="text-sm text-gray-500">
                  Member since{" "}
                  {new Date(
                    membershipData.membership.levelAssignedAt,
                  ).toLocaleDateString()}
                </p>
            </div>

              {/* Impact Points */}
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-5xl font-bold text-gray-900">
                  {membershipData.membership.impactPoints}
                </span>
                <span className="text-lg text-gray-500 font-light">
                  Impact Points
                </span>
          </div>
          
              {/* Progress to Next Level */}
              {membershipData.nextLevel && (
                <LevelProgress
                  currentPoints={membershipData.membership.impactPoints}
                  currentLevelMin={membershipData.levelInfo.minPoints}
                  nextLevelMin={membershipData.nextLevel.minPoints}
                  nextLevelName={membershipData.nextLevel.name}
                  activeBuffPercentage={totalBuffPercentage} // v2: show active buffs
                />
              )}

              {/* Max Level Reached */}
              {!membershipData.nextLevel &&
                membershipData.membership.level !== "admin" && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                    <p className="text-sm font-medium text-yellow-900">
                      🏆 Maximum level reached!
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You've achieved the highest membership tier
                    </p>
                  </div>
                )}
            </div>
          </div>
        </section>

        {/* PROGRESSION BUFFS (v2) */}
        {progressionBuffs.length > 0 && (
          <section>
            <ProgressionBuffDisplay
              totalBuffPercentage={totalBuffPercentage}
              buffDetails={progressionBuffs.map((buff) => ({
                percentage: buff.buff_percentage,
                description: buff.buff_description,
                earnedAt: buff.earned_at,
              }))}
              expiresOnUse={true}
            />
          </section>
        )}

        {/* TWO COLUMN LAYOUT: Personal Info + Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Personal Information */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
                Personal Information
              </h2>
              {!editing ? (
          <Button 
                  onClick={() => setEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 min-h-[44px] md:h-auto"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditing(false)}
                    variant="ghost"
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={saveProfile}
                    size="sm"
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
          </Button>
                </div>
              )}
        </div>

            <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
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
            </div>
          </section>

          {/* Payment Information */}
          <section className="space-y-4">
            <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
              Payment Information
            </h2>
            <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm">
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
                    <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-light text-gray-900 mb-1">
                      No Payment Required Yet
                    </h3>
                    <p className="text-sm text-gray-500 mb-6">
                      You'll only pay when your pallet reaches 100% and is ready
                      to ship. Check your reservations page for payment status.
                    </p>
                    <Link href="/profile/reservations">
                      <Button className="rounded-full px-8 bg-gray-900 hover:bg-gray-800 text-white">
                        <Package className="w-4 h-4 mr-2" />
                        View Reservations
                  </Button>
                    </Link>
                </div>
                );
              })()}
            </div>
          </section>
        </div>

        {/* YOUR PERKS */}
        <section className="space-y-4">
          <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
            Your Perks
          </h2>
          <PerksGrid perks={membershipData.perks} />
        </section>

        {/* INVITE FRIENDS */}
        <section className="space-y-4">
          <div className="flex items-start justify-between">
                        <div>
              <h2 className="text-base md:text-lg lg:text-xl font-light text-gray-900">
                Invite Friends
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Share PACT, earn Impact Points
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/50 p-4 md:p-6 shadow-sm space-y-6">
            {/* Invite Quota */}
            <InviteQuotaDisplay
              available={membershipData.invites.available}
              total={membershipData.invites.total}
              used={membershipData.invites.used}
              resetsIn={resetsIn}
            />

            {/* Admin: Level Selector (Only admins can choose level) */}
            {membershipData.membership.level === "admin" && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">
                  Start Level for New Invite
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
                    <SelectItem value="brons">Bronze (5-14 IP)</SelectItem>
                    <SelectItem value="silver">Silver (15-34 IP)</SelectItem>
                    <SelectItem value="guld">Gold (35+ IP)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose which level the invitee will start at
                          </p>
                        </div>
            )}

            {/* Non-Admin: Info text */}
            {membershipData.membership.level !== "admin" && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-800">
                  <strong>Your invitations start at Basic level.</strong> When
                  your friends join and earn Impact Points, they'll progress
                  naturally through the levels.
                </p>
                      </div>
            )}

            {/* Generate Invite Button */}
            <Button
              onClick={generateInvitation}
              disabled={
                generatingInvite || membershipData.invites.available === 0
              }
              className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white"
            >
              {generatingInvite ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {membershipData.membership.level === "admin"
                ? `Generate ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Invite`
                : "Generate Basic Invite"}
            </Button>

            {/* Active Invitations List */}
            {invitations.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-gray-200/50">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  Active Invitations
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                    {invitations.length}
                  </span>
                </h3>

                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200/50 space-y-3"
                  >
                    {/* Show initial level badge */}
                    {inv.initialLevel && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                          {inv.initialLevel.charAt(0).toUpperCase() +
                            inv.initialLevel.slice(1)}{" "}
                          Level
                        </span>
                        <span className="text-xs text-gray-500">
                          Created{" "}
                          {new Date(inv.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Invite Code */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Code</p>
                        <code className="text-sm font-mono font-semibold text-gray-900 tracking-wider">
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
                        <Copy className="w-3 h-3" />
                          </Button>
                    </div>

                    {/* Share Link */}
                    {inv.signupUrl && (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0 bg-gray-50 rounded px-2 py-1.5 border border-gray-200">
                          <p className="text-xs text-gray-500 mb-0.5">Link</p>
                          <div
                            className="font-mono text-xs text-gray-900 overflow-x-auto scrollbar-hide"
                            dangerouslySetInnerHTML={{ __html: inv.signupUrl }}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(inv.signupUrl);
                            toast.success("Link copied!");
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 flex-shrink-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                      <span className="text-xs text-gray-500">
                        Expires {new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                        <Button
                        onClick={() => deleteInvitation(inv.id)}
                          size="sm"
                        variant="ghost"
                        className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                        <X className="w-3 h-3 mr-1" />
                        Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </div>
        </section>

        {/* IMPACT POINTS TIMELINE */}
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
                {reservations.reduce((sum, r) => sum + (r.quantity || 0), 0)}
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
          </div>
        </section>

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

      {/* Gold Celebration Modal (v2) */}
      <GoldCelebration
        show={showCelebration}
        onClose={closeCelebration}
        userName={profile?.full_name}
      />
    </PageLayout>
  );
}
