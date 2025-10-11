"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogoSvg } from "@/components/layout/header/logo-svg";

function SignupPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    const inviteParam = searchParams.get("invite");

    if (inviteParam) {
      // Redirect to dedicated invite signup page
      router.push(`/i/${inviteParam}`);
      return;
    }

    if (tokenParam) {
      setToken(tokenParam);
      validateToken(tokenParam);
    }
  }, [searchParams, router]);

  const validateToken = async (tokenToValidate: string) => {
    try {
      console.log("Validating token:", tokenToValidate);

      const response = await fetch(
        `/api/validate-access-token?token=${tokenToValidate}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      console.log("Token validation response status:", response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        console.error("Token validation error:", errorData);
        setTokenValid(false);
        setError(
          `Token validation failed: ${errorData.error || errorData.message || "Unknown error"}`,
        );
        return;
      }

      const result = await response.json();
      console.log("Token validation result:", result);

      if (result.success) {
        setTokenValid(true);
        setEmail(result.email);
        console.log("Token is valid for email:", result.email);
      } else {
        setTokenValid(false);
        let errorMessage = result.message || "Invalid or expired access token";

        if (result.token) {
          if (result.token.isExpired) {
            errorMessage = "Access token has expired";
          } else if (result.token.isUsed) {
            errorMessage = "Access token has already been used";
          }
        }

        setError(errorMessage);
        console.log("Token validation failed:", errorMessage);
      }
    } catch (error) {
      console.error("Token validation network error:", error);
      setTokenValid(false);
      setError(
        `Failed to validate access token: ${error instanceof Error ? error.message : "Unknown error"}`,
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

    if (!token) {
      setError("No access token provided");
      setLoading(false);
      return;
    }

    try {
      // Handle access token signup
      const createUserResponse = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        console.error("Create user error:", errorData);

        let errorMessage = errorData.error || "Failed to create account";

        if (errorData.details) {
          errorMessage += `: ${errorData.details}`;
        }

        setError(errorMessage);
        setLoading(false);
        return;
      }

      const createUserData = await createUserResponse.json();

      if (createUserData.success && createUserData.user) {
        if (createUserData.autoSignedIn) {
          // Mark token as used
          await fetch("/api/use-access-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });

          // Remove access request from Access Control
          await fetch("/api/delete-access-request-on-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });

          // Send welcome email
          await fetch("/api/email/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerEmail: email,
              customerName: email.split("@")[0],
            }),
          });

          setSuccess(true);
          toast.success("Account created successfully!");

          console.log("✅ Auto-login successful, redirecting to home page");
          // Redirect to home page after 2 seconds
          setTimeout(() => {
            window.location.href = "/";
          }, 2000);
        } else {
          toast.success("Account created successfully. Please log in.");
          setTimeout(() => {
            router.push("/log-in");
          }, 2000);
        }
      } else {
        // Handle security validation errors
        if (createUserData.error && createUserData.error.includes("Security validation failed")) {
          setError("Security validation failed. Please try signing in manually.");
          setTimeout(() => {
            router.push("/log-in");
          }, 2000);
        } else {
          setError(createUserData.error || "Failed to create account");
        }
      }
    } catch (error) {
      setError("Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <X className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-light text-gray-900 mb-2">
            Invalid Access Token
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            {error || "This access token is invalid or has expired. Please contact support if you believe this is an error."}
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

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <LogoSvg className="h-8 mx-auto" />
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h1 className="text-2xl font-light text-gray-900 mb-4">
              Welcome to PACT
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Your account has been created successfully. Redirecting you to the platform...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <LogoSvg className="h-8" />
        </div>

        {/* Hero */}
        <div className="text-center">
          <h2 className="text-2xl font-light text-gray-900 mb-2">
            Complete Your Registration
          </h2>
          <p className="text-sm text-gray-600">
            Create your PACT account to get started
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!email}
                placeholder="Enter your email"
                className="mt-1"
              />
              {email && (
                <p className="text-xs text-gray-500 mt-1">
                  Email is pre-filled from your access approval
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Create a password"
                className="mt-1"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm your password"
                className="mt-1"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-black hover:bg-black/90 text-white"
              disabled={loading}
            >
              {loading ? (
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

        {/* Footer */}
        <p className="text-center text-xs text-gray-500">
          Complete your registration to join PACT
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <SignupPageContent />
    </Suspense>
  );
}
