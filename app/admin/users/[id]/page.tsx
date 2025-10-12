"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Calendar, Award, Users, Package, CreditCard, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

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

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [ipEvents, setIpEvents] = useState<IPEvent[]>([]);

  useEffect(() => {
    fetchUserData();
  }, [params.id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // Fetch all user data in parallel
      const [profileRes, membershipRes, reservationsRes, invitationsRes, ipEventsRes] = 
        await Promise.all([
          fetch(`/api/admin/users/${params.id}/profile`),
          fetch(`/api/admin/users/${params.id}/membership`),
          fetch(`/api/admin/users/${params.id}/reservations`),
          fetch(`/api/admin/users/${params.id}/invitations`),
          fetch(`/api/admin/users/${params.id}/ip-events`),
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
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      basic: { bg: "bg-gray-100", text: "text-gray-900" },
      brons: { bg: "bg-orange-100", text: "text-orange-900" },
      silver: { bg: "bg-gray-300", text: "text-gray-900" },
      guld: { bg: "bg-yellow-100", text: "text-yellow-900" },
      admin: { bg: "bg-purple-100", text: "text-purple-900" },
    };
    return colors[level] || colors.basic;
  };

  const getLevelDisplayName = (level: string) => {
    const names: Record<string, string> = {
      basic: "Basic",
      brons: "Bronze",
      silver: "Silver",
      guld: "Gold",
      admin: "Admin",
    };
    return names[level] || level;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => router.push("/admin/users")} className="mt-4">
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  const levelColors = membership ? getLevelColor(membership.level) : getLevelColor("basic");

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/users")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-light text-foreground">
              {profile.full_name || profile.email}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <span>{profile.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {membership && (
            <div className={`px-4 py-2 rounded-full ${levelColors.bg} ${levelColors.text} text-sm font-medium`}>
              {getLevelDisplayName(membership.level)}
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-light text-foreground">
                {membership?.impact_points || 0}
              </p>
              <p className="text-xs text-muted-foreground">Impact Points</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Package className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-light text-foreground">
                {reservations.length}
              </p>
              <p className="text-xs text-muted-foreground">Reservations</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Users className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-light text-foreground">
                {invitations.filter(i => i.used_at).length}
              </p>
              <p className="text-xs text-muted-foreground">Invites Used</p>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
              <Award className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-light text-foreground">
                {membership ? `${membership.invites_used_this_month}/${membership.invite_quota_monthly}` : "0/0"}
              </p>
              <p className="text-xs text-muted-foreground">Quota This Month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Reservations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reservations */}
          <div className="bg-background border border-border rounded-xl p-6">
            <h2 className="text-xl font-light text-foreground mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Reservations ({reservations.length})
            </h2>

            {reservations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No reservations yet</p>
            ) : (
              <div className="space-y-3">
                {reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="border border-border rounded-lg p-4 hover:border-foreground/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {reservation.total_bottles} bottles
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(reservation.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        reservation.status === 'completed' ? 'bg-green-100 text-green-900' :
                        reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-900' :
                        'bg-gray-100 text-gray-900'
                      }`}>
                        {reservation.status}
                      </span>
                    </div>
                    
                    {reservation.wines && reservation.wines.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          {reservation.wines.slice(0, 2).map((w: any) => w.wine_name).join(", ")}
                          {reservation.wines.length > 2 && ` +${reservation.wines.length - 2} more`}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Impact Points History */}
          <div className="bg-background border border-border rounded-xl p-6">
            <h2 className="text-xl font-light text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Impact Points History ({ipEvents.length})
            </h2>

            {ipEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {ipEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {event.event_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-green-600">
                      +{event.points_earned} IP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Invitations & Info */}
        <div className="space-y-6">
          {/* Membership Info */}
          {membership && (
            <div className="bg-background border border-border rounded-xl p-6">
              <h2 className="text-xl font-light text-foreground mb-4 flex items-center gap-2">
                <Award className="w-5 h-5" />
                Membership
              </h2>

              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${levelColors.bg} ${levelColors.text} text-lg font-medium mb-2`}>
                    {getLevelDisplayName(membership.level)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Member since {new Date(membership.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impact Points</span>
                    <span className="font-medium">{membership.impact_points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Quota</span>
                    <span className="font-medium">{membership.invite_quota_monthly}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Used This Month</span>
                    <span className="font-medium">{membership.invites_used_this_month}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invitations */}
          <div className="bg-background border border-border rounded-xl p-6">
            <h2 className="text-xl font-light text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Invitations ({invitations.length})
            </h2>

            <div className="mb-4 text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Total Created:</span>
                <span className="font-medium">{invitations.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Used:</span>
                <span className="font-medium text-green-600">
                  {invitations.filter(i => i.used_at).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active:</span>
                <span className="font-medium">
                  {invitations.filter(i => !i.used_at && i.is_active).length}
                </span>
              </div>
            </div>

            {invitations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No invitations created</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className={`border rounded-lg p-4 ${
                      invite.used_at 
                        ? "border-green-200 bg-green-50/30" 
                        : invite.is_active
                        ? "border-border bg-background"
                        : "border-red-200 bg-red-50/30"
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Code & Status */}
                      <div className="flex items-start justify-between">
                        <div>
                          <code className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">
                            {invite.code}
                          </code>
                          <p className="text-xs text-muted-foreground mt-1">
                            Level: <span className="font-medium">{invite.initial_level || 'basic'}</span>
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          invite.used_at 
                            ? "bg-green-100 text-green-900" 
                            : invite.is_active
                            ? "bg-blue-100 text-blue-900"
                            : "bg-red-100 text-red-900"
                        }`}>
                          {invite.used_at ? "Used" : invite.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      {/* Used By Info */}
                      {invite.used_at && invite.used_by_profile && (
                        <div className="pt-2 border-t border-green-200">
                          <p className="text-xs font-medium text-foreground mb-1">
                            Used by:
                          </p>
                          <div className="space-y-0.5">
                            {invite.used_by_profile.full_name && (
                              <p className="text-xs text-foreground">
                                👤 {invite.used_by_profile.full_name}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              📧 {invite.used_by_profile.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              🕐 {new Date(invite.used_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(invite.created_at).toLocaleDateString()} at{" "}
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

