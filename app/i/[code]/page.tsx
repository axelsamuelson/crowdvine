"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/layout/page-layout";
import { UserPlus, Check, X, Loader2, ArrowRight, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Pallet {
  id: string;
  name: string;
  description?: string;
  bottle_capacity: number;
  total_booked_bottles: number;
  remaining_bottles: number;
  completion_percentage: number;
  wine_summary: Array<{
    wine_name: string;
    vintage: string;
    grape_varieties: string;
    color: string;
    producer: string;
    total_quantity: number;
  }>;
  delivery_zone?: {
    name: string;
  };
  pickup_zone?: {
    name: string;
  };
}

interface Invitation {
  id: string;
  code: string;
  created_by: string;
  current_uses: number;
  max_uses: number;
  expires_at: string;
  profiles?: {
    email: string;
  };
}

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [pallet, setPallet] = useState<Pallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const code = params.code as string;

  useEffect(() => {
    if (code) {
      validateInvitation();
      fetchCurrentPallet();
    }
  }, [code]);

  const validateInvitation = async () => {
    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        setInvitation(data.invitation);
      } else {
        toast.error(data.error || "Invalid invitation code");
        router.push("/access-request");
      }
    } catch (error) {
      console.error("Error validating invitation:", error);
      toast.error("Failed to validate invitation");
      router.push("/access-request");
    }
  };

  const fetchCurrentPallet = async () => {
    try {
      const response = await fetch("/api/admin/pallets");
      const pallets = await response.json();
      
      if (pallets && pallets.length > 0) {
        // Get the most recent active pallet
        const activePallet = pallets.find((p: Pallet) => !p.is_complete) || pallets[0];
        setPallet(activePallet);
      }
    } catch (error) {
      console.error("Error fetching pallet:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.autoSignedIn && data.session) {
          toast.success("Account created and signed in successfully! Welcome to PACT Wines!");
          console.log("✅ Auto-login successful, setting session and redirecting to home page");
          
          // Set session using Supabase client
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          
          // Use window.location.href to force full page reload and session establishment
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        } else {
          console.log("❌ Auto-login failed, redirecting to login page");
          toast.success("Account created successfully! Please log in.");
          router.push("/log-in");
        }
      } else {
        // Handle security validation errors
        if (data.error && data.error.includes("Security validation failed")) {
          toast.error("Security validation failed. Please try signing in manually.");
          router.push("/log-in");
        } else {
          toast.error(data.error || "Failed to create account");
        }
      }
    } catch (error) {
      console.error("Error creating account:", error);
      toast.error("Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!invitation) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-gray-600 mb-4">
            This invitation code is not valid or has expired.
          </p>
          <Button onClick={() => router.push("/access-request")}>
            Request Access
          </Button>
        </div>
      </PageLayout>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = invitation.current_uses > 0;

  if (isExpired || isUsed) {
    return (
      <PageLayout>
        <div className="text-center py-10">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExpired ? "Invitation Expired" : "Invitation Already Used"}
          </h1>
          <p className="text-gray-600 mb-4">
            {isExpired
              ? "This invitation has expired. Please request a new one."
              : "This invitation has already been used."}
          </p>
          <Button onClick={() => router.push("/access-request")}>
            Request Access
          </Button>
        </div>
      </PageLayout>
    );
  }

  const senderName = invitation.profiles?.email?.split('@')[0] || "A friend";
  const friendName = "Friend"; // This would ideally come from the invitation data

  if (showSignup) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto py-8">
          <Card className="border border-gray-200">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Join PACT Wines
              </CardTitle>
              <p className="text-gray-600 mt-2">
                You've been invited to join our exclusive wine community!
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Create a password"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Already have an account?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => router.push("/log-in")}
                  >
                    Sign in
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-12">
          {/* Personal Intro Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              🎉 Congratulations, {friendName}!
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-700 mb-4">
              {senderName} has given you access to PACT.
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              PACT is a members-only platform where people buy wine together by sharing pallets – just like a wine importer.
            </p>
          </div>

          {/* Progress Bar Section */}
          {pallet && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {pallet.name}
                </h3>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{pallet.total_booked_bottles} / {pallet.bottle_capacity} bottles reserved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Closes in 3 days</span>
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="mb-6">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(pallet.completion_percentage, 100)}%` }}
                  />
                </div>
                <div className="text-center mt-2 text-sm text-gray-600">
                  {pallet.completion_percentage.toFixed(1)}% complete
                </div>
              </div>

              {/* Wine Highlights */}
              {pallet.wine_summary && pallet.wine_summary.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Featured Producers:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pallet.wine_summary.slice(0, 4).map((wine, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div>
                          <div className="font-medium text-gray-900">{wine.wine_name}</div>
                          <div className="text-sm text-gray-600">{wine.producer} • {wine.vintage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pallet Description */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">About This Pallet</h3>
            <p className="text-lg text-gray-700 leading-relaxed">
              This pallet brings together some of the most exciting producers in southern France. 
              By joining, you don't just buy wine – you unlock access to bottles usually reserved 
              for restaurants and importers.
            </p>
          </div>

          {/* Call-to-Action */}
          <div className="text-center mb-8">
            <Button 
              onClick={() => setShowSignup(true)}
              className="bg-black hover:bg-gray-800 text-white px-12 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Join the pallet
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-sm text-gray-600 mt-4 max-w-md mx-auto">
              No commitment – just reserve your share. Your spot is safe until the pallet is full.
            </p>
          </div>

          {/* Social Proof & Exclusivity */}
          <div className="text-center">
            <p className="text-gray-600 text-sm">
              PACT members already saved 37% vs retail prices. Invitation-only access means only a few can join each pallet.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}