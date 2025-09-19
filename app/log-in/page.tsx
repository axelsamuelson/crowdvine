"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LogInPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Get next parameter from URL
  const [nextUrl, setNextUrl] = useState('/profile');
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const next = urlParams.get('next');
    if (next) {
      setNextUrl(next);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (isForgotPassword) {
        // Password reset
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to reset password");
        }

        setSuccess(data.message);
        if (data.newPassword) {
          setSuccess(`${data.message} Your new password is: ${data.newPassword}`);
        }
        setEmail("");
        setIsForgotPassword(false);
      } else if (isSignUp) {
        // Real signup
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create account");
        }

        setSuccess("Account created successfully! You can now log in.");
        setEmail("");
        setPassword("");
        setFullName("");
        setIsSignUp(false);
      } else {
        // Real login
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Invalid email or password");
        }

        setSuccess("Login successful! Redirecting...");
        setEmail("");
        setPassword("");

        // Redirect using Next.js router to the intended destination
        setTimeout(() => {
          router.push(nextUrl);
        }, 1000);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isForgotPassword
            ? "Failed to reset password. Please try again."
            : isSignUp
              ? "Failed to create account. Please try again."
              : "Invalid email or password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isForgotPassword ? "Reset your password" : isSignUp ? "Create your account" : "Welcome back"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isForgotPassword
              ? "Enter your email to receive a new password"
              : isSignUp
                ? "Join CrowdVine to start reserving wines"
                : "Sign in to your CrowdVine account"}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {isSignUp && !isForgotPassword && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={isSignUp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {!isForgotPassword && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={
                      isSignUp ? "Create a password" : "Enter your password"
                    }
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isForgotPassword
                    ? "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                    : isSignUp
                      ? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                      : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                }`}
              >
                {loading
                  ? isForgotPassword
                    ? "Resetting password..."
                    : isSignUp
                      ? "Creating account..."
                      : "Signing in..."
                  : isForgotPassword
                    ? "Reset password"
                    : isSignUp
                      ? "Sign up"
                      : "Sign in"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isForgotPassword
                    ? "Remember your password?"
                    : isSignUp
                      ? "Already have an account?"
                      : "Don't have an account?"}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {!isForgotPassword && (
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setSuccess("");
                    setEmail("");
                    setPassword("");
                    setFullName("");
                    setIsForgotPassword(false);
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSignUp ? "Sign in instead" : "Create account"}
                </button>
              )}
              
              {!isSignUp && (
                <button
                  onClick={() => {
                    setIsForgotPassword(!isForgotPassword);
                    setError("");
                    setSuccess("");
                    setEmail("");
                    setPassword("");
                    setFullName("");
                  }}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  {isForgotPassword ? "Back to sign in" : "Forgot password?"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
