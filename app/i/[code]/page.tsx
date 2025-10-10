"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface Invitation {
  id: string;
  code: string;
  created_by: string;
  current_uses: number;
  max_uses: number;
  expires_at: string;
  initial_level?: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export default function InviteSignupPage() {
  const params = useParams();
  const router = useRouter();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  const code = params.code as string;

  useEffect(() => {
    if (code) {
      validateInvitation();
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
    } finally {
      setLoading(false);
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
          invitation_code: code,
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          full_name: formData.full_name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.autoSignedIn && data.session) {
          // User was automatically signed in
          const supabase = getSupabaseBrowserClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });

          toast.success("Account created and signed in successfully!");
          
          // Redirect to home page after a short delay
          setTimeout(() => {
            window.location.href = "/";
          }, 1000);
        } else {
          // Auto sign-in failed, redirect to login
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <X className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            This invitation code is not valid or has expired.
          </p>
          <Button 
            onClick={() => router.push("/access-request")}
            className="bg-black hover:bg-black/90 text-white"
          >
            Request Access
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = new Date(invitation.expires_at) < new Date();
  const isUsed = invitation.current_uses > 0;

  if (isExpired || isUsed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <X className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">
            {isExpired ? "Invitation Expired" : "Invitation Already Used"}
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {isExpired
              ? "This invitation has expired. Please request a new one."
              : "This invitation has already been used."}
          </p>
          <Button 
            onClick={() => router.push("/access-request")}
            className="bg-black hover:bg-black/90 text-white"
          >
            Request Access
          </Button>
        </div>
      </div>
    );
  }

  // Get sender name from invitation data with safe access
  const senderName = (() => {
    try {
      // Try full_name first, then email username, then fallback
      if (invitation?.profiles?.full_name) {
        return invitation.profiles.full_name;
      }
      if (invitation?.profiles?.email) {
        return invitation.profiles.email.split('@')[0];
      }
      return "A friend";
    } catch (error) {
      console.error("Error getting sender name:", error);
      return "A friend";
    }
  })();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-2xl font-light tracking-tight text-gray-900">PACT</h1>
        </div>

        {/* Hero */}
        <div className="text-center">
          <h2 className="text-2xl font-light text-gray-900 mb-2">
            You've been invited to PACT
          </h2>
          <p className="text-sm text-gray-600">
            Join the platform and start reserving wines
          </p>
        </div>

        {/* Membership Level */}
        {invitation.initial_level && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center space-y-3">
              {/* Level Badge - Minimal */}
              <div className={`inline-block px-4 py-1.5 rounded-md text-sm font-medium ${
                invitation.initial_level === 'guld' ? 'bg-gray-900 text-white' :
                invitation.initial_level === 'silver' ? 'bg-gray-700 text-white' :
                invitation.initial_level === 'brons' ? 'bg-gray-600 text-white' :
                'bg-gray-500 text-white'
              }`}>
                {invitation.initial_level.charAt(0).toUpperCase() + invitation.initial_level.slice(1)} Membership
              </div>

              {/* Perks - Single line */}
              <p className="text-sm text-gray-600">
                {invitation.initial_level === 'guld' && 'Maximum perks • 50 invites/month • Fee waived'}
                {invitation.initial_level === 'silver' && 'Early access • 12 invites/month • Fee capped'}
                {invitation.initial_level === 'brons' && 'Queue priority • 5 invites/month'}
                {invitation.initial_level === 'basic' && 'Entry level • 2 invites/month'}
              </p>
            </div>
          </div>
        )}

        {/* Signup Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm font-medium text-gray-700">
                Full Name
              </Label>
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
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
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
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
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

            <Button
              type="submit"
              className="w-full bg-black hover:bg-black/90 text-white"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          {/* Sign in link */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Already have an account?{" "}
              <button 
                onClick={() => router.push("/log-in")}
                className="text-gray-900 underline hover:no-underline"
                type="button"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>

        {/* Sender Attribution */}
        <p className="text-center text-xs text-gray-500">
          Invited by {senderName}
        </p>
      </div>
    </div>
  );
}