"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Calendar,
  Award,
  Users,
  Package,
  CreditCard,
  TrendingUp,
  Eye,
  LayoutGrid,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { UserEventsCard } from "./user-events-card";
import {
  getLevelInfo,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  access_granted_at: string | null;
  role: string;
}

interface Membership {
  level: string;
  impact_points: number;
  invite_quota_monthly: number;
  invites_used_this_month: number;
  created_at: string;
  founding_member_since?: string | null;
}

interface Reservation {
  id: string;
  created_at: string;
  status: string;
  total_bottles: number;
  wines: any[];
}

interface Invitation {
  id: string;
  code: string;
  created_at: string;
  used_at: string | null;
  used_by_email: string | null;
  used_by_user_id: string | null;
  initial_level: string;
  is_active: boolean;
  used_by_profile?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface IPEvent {
  id: string;
  event_type: string;
  points_earned: number;
  created_at: string;
  metadata: any;
}

interface ViewStats {
  plpViews: number;
  pdpViews: number;
}

type AccountSourceType =
  | "invitation"
  | "access_token"
  | "access_request"
  | "direct_signup"
  | "unknown";

interface AccountSourcePayload {
  source: AccountSourceType;
  invitation?: {
    code?: string;
    initial_level?: string | null;
    used_at?: string | null;
    inviter_profile?: { id: string; email: string; full_name: string | null } | null;
  };
  access_request?: { status: string; requested_at?: string | null } | null;
  access_token?: { used_at?: string | null; initial_level?: string | null } | null;
  profile?: { invite_code_used?: string | null } | null;
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = React.use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ipEvents, setIpEvents] = useState<IPEvent[]>([]);
  const [views, setViews] = useState<ViewStats>({ plpViews: 0, pdpViews: 0 });
  const [accountSource, setAccountSource] = useState<AccountSourcePayload | null>(
    null,
  );
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const resetConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (resetConfirmTimerRef.current) {
        clearTimeout(resetConfirmTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchUserData(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUserData = async (id: string) => {
    try {
      setLoading(true);

      // Fetch all user data in parallel
      const [
        profileRes,
        membershipRes,
        reservationsRes,
        invitationsRes,
        ipEventsRes,
        viewsRes,
        accountSourceRes,
      ] = await Promise.all([
        fetch(`/api/admin/users/${id}/profile`),
        fetch(`/api/admin/users/${id}/membership`),
        fetch(`/api/admin/users/${id}/reservations`),
        fetch(`/api/admin/users/${id}/invitations`),
        fetch(`/api/admin/users/${id}/ip-events`),
        fetch(`/api/admin/users/${id}/views`),
        fetch(`/api/admin/users/${id}/account-source`),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
      }

      if (membershipRes.ok) {
        const data = await membershipRes.json();
        setMembership(data);
      }

      if (reservationsRes.ok) {
        const data = await reservationsRes.json();
        setReservations(data);
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data);
      }

      if (ipEventsRes.ok) {
        const data = await ipEventsRes.json();
        setIpEvents(data);
      }

      if (viewsRes.ok) {
        const data = await viewsRes.json();
        setViews({
          plpViews: typeof data?.plpViews === "number" ? data.plpViews : 0,
          pdpViews: typeof data?.pdpViews === "number" ? data.pdpViews : 0,
        });
      }

      if (accountSourceRes.ok) {
        const data = await accountSourceRes.json();
        setAccountSource(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetImpactPoints = async () => {
    setResetError(null);
    setResetting(true);
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/reset-impact-points`,
        { method: "POST" },
      );
      const data: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Reset failed";
        setResetError(msg);
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        (data as { success: unknown }).success === true
      ) {
        setMembership((prev) =>
          prev ? { ...prev, impact_points: 0 } : prev,
        );
        if (resetConfirmTimerRef.current) {
          clearTimeout(resetConfirmTimerRef.current);
        }
        setResetConfirm(true);
        resetConfirmTimerRef.current = setTimeout(() => {
          setResetConfirm(false);
          resetConfirmTimerRef.current = null;
        }, 2000);
      }
    } finally {
      setResetting(false);
    }
  };

  const getLevelColor = (level: string) => {
    const m = normalizeMembershipLevel(level);
    const colors: Record<string, { bg: string; text: string }> = {
      requester: { bg: "bg-gray-200 dark:bg-zinc-700", text: "text-gray-900 dark:text-zinc-100" },
      basic: { bg: "bg-slate-200 dark:bg-slate-700", text: "text-slate-900 dark:text-slate-100" },
      brons: { bg: "bg-indigo-200 dark:bg-indigo-800/60", text: "text-indigo-950 dark:text-indigo-100" },
      silver: { bg: "bg-emerald-200 dark:bg-emerald-800/60", text: "text-emerald-950 dark:text-emerald-100" },
      guld: { bg: "bg-[#E4CAA0]/30 dark:bg-amber-900/50", text: "text-gray-900 dark:text-amber-100" },
      privilege: { bg: "bg-rose-200 dark:bg-rose-900/50", text: "text-rose-950 dark:text-rose-100" },
      founding_member: {
        bg: "bg-amber-100 border border-amber-400",
        text: "text-amber-900",
      },
    };
    return colors[m] || colors.basic;
  };

  const getLevelDisplayName = (level: string) => getLevelInfo(level).name;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">User not found</p>
          <Button onClick={() => router.push("/admin/users")} className="mt-4 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white" variant="outline">
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const levelColors = membership
    ? getLevelColor(membership.level)
    : getLevelColor("basic");

  const renderAccountSource = () => {
    if (!accountSource) return null;
    if (accountSource.source === "invitation") {
      const inviter = accountSource.invitation?.inviter_profile;
      return (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4" />
          <span>
            Invited by{" "}
            <span className="text-gray-900 dark:text-white">
              {inviter?.full_name || inviter?.email || "Unknown"}
            </span>
            {accountSource.invitation?.code
              ? ` (code: ${accountSource.invitation.code})`
              : ""}
          </span>
        </div>
      );
    }
    if (accountSource.source === "access_token") {
      return (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <LinkIcon className="w-4 h-4" />
          <span>Created via approved access link</span>
        </div>
      );
    }
    if (accountSource.source === "access_request") {
      return (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <LinkIcon className="w-4 h-4" />
          <span>
            Access request:{" "}
            <span className="text-gray-900 dark:text-white">
              {accountSource.access_request?.status || "unknown"}
            </span>
          </span>
        </div>
      );
    }
    if (accountSource.source === "direct_signup") {
      return (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap">
          <LinkIcon className="w-4 h-4" />
          <span>Created via direct signup</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/users")}
          className="mb-4 gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1F1F23]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {profile.full_name || profile.email}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {renderAccountSource()}
          </div>

          {membership && (
            <div
              className={`px-4 py-2 rounded-full ${levelColors.bg} ${levelColors.text} text-sm font-medium shrink-0`}
            >
              {getLevelDisplayName(membership.level)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {membership?.impact_points || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Impact Points</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {reservations.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Reservations</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {invitations.filter((i) => i.used_at).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Invites Used</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <Award className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {membership
                  ? `${membership.invites_used_this_month}/${membership.invite_quota_monthly}`
                  : "0/0"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quota This Month</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{views.plpViews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PLP Views</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#1F1F23] flex items-center justify-center">
              <Eye className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{views.pdpViews}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">PDP Views</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Reservations */}
          <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Reservations ({reservations.length})
            </h2>

            {reservations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No reservations yet
              </p>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-gray-200 dark:border-[#1F1F23] rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#1F1F23] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {reservation.total_bottles} bottles
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            reservation.created_at,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          reservation.status === "completed"
                            ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                            : reservation.status === "pending"
                              ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
                              : "bg-gray-100 text-gray-900 dark:bg-zinc-700 dark:text-zinc-200"
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </div>

                    {reservation.wines && reservation.wines.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-[#1F1F23]">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {reservation.wines
                            .slice(0, 2)
                            .map((w: any) => w.wine_name)
                            .join(", ")}
                          {reservation.wines.length > 2 &&
                            ` +${reservation.wines.length - 2} more`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Impact Points History */}
          <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Impact Points History ({ipEvents.length})
            </h2>

            {ipEvents.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No activity yet
              </p>
            ) : (
              <div className="space-y-2">
                {ipEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-[#1F1F23] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {event.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      +{event.points_earned} IP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <UserEventsCard userId={userId} />
        </div>

        <div className="space-y-6">
          {membership && (
            <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Membership
              </h2>

              <div className="space-y-4">
                <div className="text-center py-4">
                  <div
                    className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${levelColors.bg} ${levelColors.text} text-lg font-medium mb-2`}
                  >
                    {getLevelDisplayName(membership.level)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Member since{" "}
                    {new Date(membership.created_at).toLocaleDateString()}
                  </p>
                  {normalizeMembershipLevel(membership.level) ===
                  "founding_member" ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Founding Member since{" "}
                      {membership.founding_member_since
                        ? new Date(
                            membership.founding_member_since,
                          ).toLocaleDateString()
                        : "Recently granted"}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-start gap-2 text-gray-900 dark:text-white">
                    <span className="text-gray-500 dark:text-gray-400 shrink-0">
                      Impact Points
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {membership.impact_points}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleResetImpactPoints()}
                          disabled={
                            resetting || membership.impact_points === 0
                          }
                          className="text-xs font-medium text-destructive underline underline-offset-2 decoration-border hover:opacity-70 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {resetting ? "Resetting..." : "Reset to 0"}
                        </button>
                      </div>
                      {resetConfirm ? (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          Reset ✓
                        </span>
                      ) : null}
                      {resetError ? (
                        <span className="text-xs text-destructive">
                          {resetError}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-white">
                    <span className="text-gray-500 dark:text-gray-400">Monthly Quota</span>
                    <span className="font-medium">{membership.invite_quota_monthly}</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-white">
                    <span className="text-gray-500 dark:text-gray-400">Used This Month</span>
                    <span className="font-medium">{membership.invites_used_this_month}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Invitations ({invitations.length})
            </h2>

            <div className="mb-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Total Created:</span>
                <span className="font-medium text-gray-900 dark:text-white">{invitations.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {invitations.filter((i) => i.used_at).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {invitations.filter((i) => !i.used_at && i.is_active).length}
                </span>
              </div>
            </div>

            {invitations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                No invitations created
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className={`border rounded-lg p-4 ${
                      invite.used_at
                        ? "border-green-200 dark:border-green-800/50 bg-green-50/30 dark:bg-green-900/20"
                        : invite.is_active
                          ? "border-gray-200 dark:border-[#1F1F23] bg-transparent dark:bg-transparent"
                          : "border-red-200 dark:border-red-800/50 bg-red-50/30 dark:bg-red-900/20"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <code className="text-xs font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {invite.code}
                          </code>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Level:{" "}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {invite.initial_level || "basic"}
                            </span>
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            invite.used_at
                              ? "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200"
                              : invite.is_active
                                ? "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200"
                                : "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200"
                          }`}
                        >
                          {invite.used_at
                            ? "Used"
                            : invite.is_active
                              ? "Active"
                              : "Inactive"}
                        </span>
                      </div>

                      {invite.used_at && invite.used_by_profile && (
                        <div className="pt-2 border-t border-green-200 dark:border-green-800/50">
                          <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                            Used by:
                          </p>
                          <div className="space-y-0.5">
                            {invite.used_by_profile.full_name && (
                              <p className="text-xs text-gray-900 dark:text-white">
                                👤 {invite.used_by_profile.full_name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              📧 {invite.used_by_profile.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              🕐 {new Date(invite.used_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200 dark:border-[#1F1F23]">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Created{" "}
                          {new Date(invite.created_at).toLocaleDateString()} at{" "}
                          {new Date(invite.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
