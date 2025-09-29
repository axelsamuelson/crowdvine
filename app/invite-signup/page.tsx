"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, UserPlus } from "lucide-react";

function InviteSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [inviteCode, setInviteCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  useEffect(() => {
    const inviteParam = searchParams.get("invite");

    if (inviteParam) {
      setInviteCode(inviteParam);
      validateInvite(inviteParam);
    } else {
      setInviteValid(false);
      setError("No invitation code provided");
    }
  }, [searchParams]);

  const validateInvite = async (code: string) => {
    try {
      console.log("Validating invitation code:", code);

      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      console.log("Invitation validation response status:", response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        console.error("Invitation validation error:", errorData);
        setInviteValid(false);
        setError(
          `Invitation validation failed: ${errorData.error || errorData.message || "Unknown error"}`,
        );
        return;
      }

      const result = await response.json();
      console.log("Invitation validation result:", result);

      if (result.success) {
        setInviteValid(true);
        console.log("Invitation code is valid");
      } else {
        setInviteValid(false);
        setError(result.error || "Invalid or expired invitation code");
        console.log("Invitation validation failed:", result.error);
      }
    } catch (error) {
      console.error("Invitation validation network error:", error);
      setInviteValid(false);
      setError(
        `Failed to validate invitation code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!inviteCode) {
      setError("No invitation code provided");
      setLoading(false);
      return;
    }

    try {
      // Handle invitation signup
      const inviteResponse = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          code: inviteCode,
        }),
      });

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json();
        console.error("Invitation signup error:", errorData);
        setError(errorData.error || "Failed to create account with invitation");
        setLoading(false);
        return;
      }

      const inviteData = await inviteResponse.json();

      if (inviteData.success && inviteData.user) {
        if (inviteData.autoSignedIn) {
          setSuccess(true);
          console.log("✅ Auto-login successful, redirecting to home page");
          // Redirect to home page after 2 seconds since user is now logged in
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        } else {
          setError("Account created successfully. Please log in manually.");
          setTimeout(() => {
            router.push("/log-in");
          }, 2000);
        }
      } else {
        // Handle security validation errors
        if (inviteData.error && inviteData.error.includes("Security validation failed")) {
          setError("Security validation failed. Please try signing in manually.");
          setTimeout(() => {
            router.push("/log-in");
          }, 2000);
        } else {
          setError(inviteData.error || "Failed to create account");
        }
      }
    } catch (error) {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  if (inviteValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating invitation code...</p>
        </div>
      </div>
    );
  }

  if (inviteValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {error ||
                  "This invitation code is invalid or has expired. Please contact the person who invited you for a new invitation."}
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={() => router.push("/access-request")}
                className="w-full"
              >
                Request Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">
              Welcome to CrowdVine!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              Your account has been created and you're now signed in!
              Welcome to our exclusive wine community.
            </p>
            <div className="text-center">
              <Button onClick={() => router.push("/")} className="w-full">
                Continue to Platform
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <UserPlus className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join CrowdVine
          </CardTitle>
          <p className="text-gray-600 mt-2">
            You've been invited to join our exclusive wine community
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
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
                Sign in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InviteSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <InviteSignupContent />
    </Suspense>
  );
}
