"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

function CodeSignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    code: code || "",
  });

  const [loading, setLoading] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeValid, setCodeValid] = useState<boolean | null>(null);
  const [codeError, setCodeError] = useState("");

  // Validate invitation code when component mounts or code changes
  useEffect(() => {
    if (code) {
      validateInvitationCode(code);
    }
  }, [code]);

  const validateInvitationCode = async (invitationCode: string) => {
    if (!invitationCode) return;

    setValidatingCode(true);
    setCodeError("");

    try {
      const response = await fetch("/api/invitations/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: invitationCode }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCodeValid(true);
          setFormData((prev) => ({ ...prev, code: invitationCode }));
        } else {
          setCodeValid(false);
          setCodeError(data.error || "Invalid invitation code");
        }
      } else {
        setCodeValid(false);
        setCodeError("Failed to validate invitation code");
      }
    } catch (error) {
      console.error("Error validating invitation code:", error);
      setCodeValid(false);
      setCodeError("Network error. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Validate code if it's being manually entered
    if (name === "code" && value.length >= 8) {
      validateInvitationCode(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codeValid) {
      toast.error("Please enter a valid invitation code");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/invitations/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          code: formData.code,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.autoSignedIn) {
          toast.success("Account created and signed in successfully!");
          // Redirect to profile page since user is now logged in
          setTimeout(() => {
            window.location.href = "/profile";
          }, 2000);
        } else {
          toast.success("Account created successfully! Please log in.");
          // Redirect to login page
          router.push(
            "/log-in?message=Account created successfully! Please log in.",
          );
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
      console.error("Signup error:", error);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Join with Invitation Code
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your invitation code to create your account
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Create Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Invitation Code */}
              <div>
                <Label htmlFor="code">Invitation Code</Label>
                <div className="mt-1 relative">
                  <Input
                    id="code"
                    name="code"
                    type="text"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Enter your invitation code"
                    className="pr-10"
                    disabled={!!code} // Disable if code came from URL
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {validatingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : codeValid === true ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : codeValid === false ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </div>
                {codeError && (
                  <Alert className="mt-2">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{codeError}</AlertDescription>
                  </Alert>
                )}
                {codeValid && (
                  <Alert className="mt-2">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Invitation code is valid!
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Full Name */}
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !codeValid || validatingCode}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    Already have an account?
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/log-in")}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CodeSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <CodeSignupContent />
    </Suspense>
  );
}
