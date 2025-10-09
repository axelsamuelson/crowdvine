"use client";

import { useEffect, useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { LevelBadge } from "@/components/membership/level-badge";
import { PerksGrid, LockedPerks } from "@/components/membership/perks-grid";
import { IPTimeline } from "@/components/membership/ip-timeline";
import { LevelProgress } from "@/components/membership/level-progress";
import { InviteQuotaDisplay } from "@/components/membership/invite-quota-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Mail, Phone, MapPin, CreditCard, Plus, Edit, Save, X,
  LogOut, UserPlus, Copy, Check, Wifi, WifiOff, Calendar, Package, Settings
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentMethodCard } from "@/components/ui/payment-method-card";
import { MiniProgress } from "@/components/ui/progress-components";
import { getTimeUntilReset } from "@/lib/membership/invite-quota";
import { MembershipLevel } from "@/lib/membership/points-engine";

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
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [ipEvents, setIpEvents] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<MembershipLevel>('basic');
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "Sweden",
  });

  // Fetch all data
  useEffect(() => {
    Promise.all([
      fetchProfile(),
      fetchMembershipData(),
      fetchIPEvents(),
      fetchPaymentMethods(),
      fetchReservations(),
      fetchInvitation(),
    ]).finally(() => setLoading(false));
  }, []);

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

  const fetchPaymentMethods = async () => {
    try {
      const res = await fetch("/api/user/payment-methods");
      if (res.ok) {
        const data = await res.json();
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/user/reservations");
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations || []);
      }
    } catch (error) {
      console.error("Error fetching reservations:", error);
    }
  };

  const fetchInvitation = async () => {
    try {
      const res = await fetch("/api/user/invitations");
      if (res.ok) {
        const data = await res.json();
        if (data.invitations && data.invitations.length > 0) {
          setInvitation(data.invitations[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching invitation:", error);
    }
  };

  const generateInvitation = async () => {
    setGeneratingInvite(true);
    try {
      // Check if user is admin to use admin endpoint with level selection
      const isAdmin = membershipData?.membership.level === 'admin';
      const endpoint = isAdmin ? "/api/admin/invitations/generate" : "/api/invitations/generate";
      
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
        setInvitation(data.invitation);
        toast.success(`Invitation code generated!${isAdmin ? ` (Start level: ${selectedLevel})` : ''}`);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to generate invitation");
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
      <div className="max-w-6xl mx-auto space-y-8 md:space-y-12">
        
        {/* MEMBERSHIP STATUS HERO */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 md:p-10 shadow-sm">
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
                <p className="text-sm text-gray-500">Member since {new Date(membershipData.membership.levelAssignedAt).toLocaleDateString()}</p>
              </div>

              {/* Impact Points */}
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-5xl font-bold text-gray-900">
                  {membershipData.membership.impactPoints}
                </span>
                <span className="text-lg text-gray-500 font-light">Impact Points</span>
              </div>

              {/* Progress to Next Level */}
              {membershipData.nextLevel && (
                <LevelProgress
                  currentPoints={membershipData.membership.impactPoints}
                  currentLevelMin={membershipData.levelInfo.minPoints}
                  nextLevelMin={membershipData.nextLevel.minPoints}
                  nextLevelName={membershipData.nextLevel.name}
                />
              )}

              {/* Max Level Reached */}
              {!membershipData.nextLevel && membershipData.membership.level !== 'admin' && (
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

        {/* TWO COLUMN LAYOUT: Personal Info + Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg md:text-xl font-light text-gray-900">Personal Information</h2>
              {!editing ? (
                <Button
                  onClick={() => setEditing(true)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900"
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

            <div className="bg-white rounded-xl border border-gray-200/50 p-6 shadow-sm">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name" className="text-xs text-gray-600">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-gray-600">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-xs text-gray-600">Address</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="city" className="text-xs text-gray-600">City</Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code" className="text-xs text-gray-600">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
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
                      <p className="text-sm text-gray-900">{profile.full_name}</p>
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
                        {[profile.address, profile.city, profile.postal_code, profile.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Payment Methods */}
          <section className="space-y-4">
            <h2 className="text-lg md:text-xl font-light text-gray-900">Payment Methods</h2>
            <div className="bg-white rounded-xl border border-gray-200/50 p-6 shadow-sm">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-light text-gray-900 mb-1">No payment methods</h3>
                  <p className="text-sm text-gray-500 mb-6">Add a payment method to start making reservations</p>
                  <Button className="rounded-full px-8 bg-gray-900 hover:bg-gray-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onSetDefault={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* YOUR PERKS */}
        <section className="space-y-4">
          <h2 className="text-lg md:text-xl font-light text-gray-900">Your Perks</h2>
          <PerksGrid perks={membershipData.perks} />
        </section>

        {/* INVITE FRIENDS */}
        <section className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-light text-gray-900">Invite Friends</h2>
              <p className="text-sm text-gray-500 mt-0.5">Share PACT, earn Impact Points</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/50 p-6 shadow-sm space-y-6">
            {/* Invite Quota */}
            <InviteQuotaDisplay
              available={membershipData.invites.available}
              total={membershipData.invites.total}
              used={membershipData.invites.used}
              resetsIn={resetsIn}
            />

            {/* Admin: Level Selector */}
            {membershipData.membership.level === 'admin' && !invitation && (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Start Level for Invitee</Label>
                <Select value={selectedLevel} onValueChange={(val) => setSelectedLevel(val as MembershipLevel)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (0-4 IP)</SelectItem>
                    <SelectItem value="brons">Brons (5-14 IP)</SelectItem>
                    <SelectItem value="silver">Silver (15-34 IP)</SelectItem>
                    <SelectItem value="guld">Guld (35+ IP)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose which level the invitee will start at
                </p>
              </div>
            )}

            {/* Generate Invite */}
            {!invitation ? (
              <Button
                onClick={generateInvitation}
                disabled={generatingInvite || membershipData.invites.available === 0}
                className="w-full rounded-full bg-gray-900 hover:bg-gray-800 text-white"
              >
                {generatingInvite ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                {membershipData.membership.level === 'admin' 
                  ? `Generate ${selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Invite`
                  : 'Generate Invite Link'}
              </Button>
            ) : (
              <div className="space-y-3">
                {/* Show initial level if admin */}
                {invitation.initialLevel && membershipData.membership.level === 'admin' && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-800">
                      <strong>Start Level:</strong> {invitation.initialLevel.charAt(0).toUpperCase() + invitation.initialLevel.slice(1)}
                    </p>
                  </div>
                )}

                {/* Invite Code */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Your Invite Code</span>
                    <Button
                      onClick={copyCode}
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Code
                        </>
                      )}
                    </Button>
                  </div>
                  <code className="text-lg font-mono font-semibold text-gray-900 tracking-wider">
                    {invitation.code}
                  </code>
                </div>

                {/* Share Link */}
                {invitation.signupUrl && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Share Link</span>
                      <Button
                        onClick={copyUrl}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Link
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-700 break-all font-mono">{invitation.signupUrl}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* IMPACT POINTS TIMELINE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-light text-gray-900">Recent Activity</h2>
            {ipEvents.length > 0 && (
              <Link 
                href="/profile/activity" 
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                View all
              </Link>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200/50 p-6 shadow-sm">
            <IPTimeline events={ipEvents} />
          </div>
        </section>

        {/* MY RESERVATIONS (Compact) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-light text-gray-900">My Reservations</h2>
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
                {new Set(reservations.map(r => r.pallet_id).filter(Boolean)).size}
              </p>
            </div>
          </div>
        </section>

        {/* Account Actions */}
        <section className="pt-6 border-t border-gray-200">
          <Button
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </section>
      </div>
    </PageLayout>
  );
}

