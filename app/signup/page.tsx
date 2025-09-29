"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
      router.push(`/invite-signup?invite=${inviteParam}`);
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
      setError("No access token or invitation code provided");
      setLoading(false);
      return;
    }

    try {
      // Handle access token signup (existing flow)
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

        if (errorData.debug) {
          console.log("Debug info:", errorData.debug);
          // Add debug info to error message for development
          if (process.env.NODE_ENV === "development") {
            errorMessage += ` (Debug: ${errorData.debug.errorType})`;
          }
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

          // Remove access request from Access Control (moves to Users)
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
              customerName: email.split("@")[0], // Use email prefix as name
            }),
          });

          setSuccess(true);

          // Redirect to profile page after 3 seconds since user is now logged in
          setTimeout(() => {
            router.push("/profile");
          }, 3000);
        } else {
          setError("Account created successfully. Please log in manually.");
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating access token...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Access Token</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                {error ||
                  "This access token is invalid or has expired. Please contact support if you believe this is an error."}
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
              Account Created Successfully!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              Welcome to CrowdVine! Your account has been created and you're now signed in.
              You can now explore our exclusive wine community.
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
          <CardTitle>Complete Your Registration</CardTitle>
          <p className="text-gray-600">Create your CrowdVine account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!email}
                className={email ? "bg-gray-100" : ""}
              />
              <p className="text-sm text-gray-500">
                {email
                  ? "Email is pre-filled from your access approval"
                  : "Enter your email address"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Create a password (min 6 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Confirm your password"
              />
            </div>

            {error && (
              <Alert>
                <XCircle className="w-4 h-4" />
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
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
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
      <SignupPageContent />
    </Suspense>
  );
}
