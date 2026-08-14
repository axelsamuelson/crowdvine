"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type Props = {
  token: string;
  nextPath: string;
  email: string;
  producerName: string;
};

export function ProducerSignupForm({
  token,
  nextPath,
  email,
  producerName,
}: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loginHref = `/log-in?next=${encodeURIComponent(
    `${nextPath}${nextPath.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`,
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/producer/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Could not create account");
      }

      const { getSupabaseBrowserClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        toast.success("Account created. Please log in.");
        window.location.href = loginHref;
        return;
      }

      toast.success("Account created");
      window.location.href = nextPath.startsWith("/") ? nextPath : "/producer";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Name</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            readOnly
            autoComplete="username"
            className="bg-gray-50 text-gray-700"
          />
          <p className="text-xs text-gray-500">
            This account will be linked to {producerName}. Signup must use this
            contact email.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-black text-white hover:bg-black/90"
        >
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-medium text-gray-900 underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </Card>
  );
}
