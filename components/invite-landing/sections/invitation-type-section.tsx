"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getLevelInfo } from "@/lib/membership/points-engine";
import { MetallicMembershipCard } from "../metallic-membership-card";
import { DirtyWineLogo } from "../dirty-wine-logo";

export type InvitationType = "consumer" | "producer" | "business";

export interface InvitationFormData {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
  selected_type?: InvitationType | null;
}

const INVITATION_TYPE_LABELS: Record<InvitationType, string> = {
  consumer: "Consumer",
  producer: "Producer",
  business: "Business",
};

type FormStep = 1 | 2 | 3;

interface InvitationTypeSectionProps {
  allowedTypes: InvitationType[];
  defaultType: InvitationType;
  canChangeAccountType: boolean;
  initialMembershipLevel?: string | null;
  inviterName?: string | null;
  welcomeName?: string | null;
  formData: InvitationFormData;
  onFormChange: (data: Partial<InvitationFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  /** When true, show Dirty Wine logo instead of "Sign up to claim membership" */
  showDirtyWineLogo?: boolean;
}

const validLevels = ["basic", "brons", "silver", "guld", "privilege"] as const;

function toTitleCase(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function InvitationTypeSection({
  allowedTypes,
  defaultType,
  canChangeAccountType,
  initialMembershipLevel,
  inviterName,
  welcomeName,
  formData,
  onFormChange,
  onSubmit,
  submitting,
  showDirtyWineLogo = false,
}: InvitationTypeSectionProps) {
  const [step, setStep] = useState<FormStep>(1);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const currentType =
    canChangeAccountType && formData.selected_type && allowedTypes.includes(formData.selected_type)
      ? formData.selected_type
      : defaultType;

  const levelKey =
    initialMembershipLevel && validLevels.includes(initialMembershipLevel as (typeof validLevels)[number])
      ? (initialMembershipLevel as (typeof validLevels)[number])
      : "basic";
  const inviterDisplayName = inviterName?.trim() || "a member";
  const isWelcome = !!welcomeName?.trim();
  const displayName = welcomeName ? toTitleCase(welcomeName) : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError(null);
    if (formData.password !== formData.password_confirm) {
      setConfirmError("Passwords do not match.");
      return;
    }
    onSubmit(e);
  };

  const goToStep = (next: FormStep) => {
    if (next <= step) {
      setStep(next);
      return;
    }
    if (step === 1 && next === 2 && formData.full_name.trim()) setStep(2);
    if (step === 2 && next === 3 && formData.email.trim()) setStep(3);
  };

  const canProceedFrom1 = formData.full_name.trim().length > 0;
  const canProceedFrom2 = formData.email.trim().length > 0;

  if (isWelcome) {
    return (
      <section className="relative py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md mx-auto text-center"
        >
          <div className="flex justify-center mb-6">
            <MetallicMembershipCard
              variant={levelKey}
              memberName={displayName}
            />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Welcome, {displayName}
          </h2>
          <p className="text-muted-foreground">
            You are now a member of PACT and can access the platform.
          </p>
          <Button asChild className="mt-6 bg-black text-white hover:bg-black/90 hover:text-white">
            <a href="/">Go to platform</a>
          </Button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="relative py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md mx-auto"
      >
        <div className="mb-8 text-center">
          {showDirtyWineLogo ? (
            <div className="mb-4 flex justify-center">
              <DirtyWineLogo className="max-w-[200px] w-full h-auto" />
            </div>
          ) : (
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Sign up to claim membership
            </h2>
          )}
          <p className="text-muted-foreground text-sm">
            {inviterDisplayName} invited you to join. Create your account below.
          </p>
        </div>

        {canChangeAccountType && allowedTypes.length > 1 && (
          <div className="mb-6">
            <Label className="text-muted-foreground">Account type</Label>
            <div className="flex gap-2 mt-2">
              {allowedTypes.map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={currentType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFormChange({ selected_type: t })}
                >
                  {INVITATION_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>
        )}

        {allowedTypes.length === 1 && allowedTypes[0] === "consumer" && (
          <div className="mb-6 flex justify-center">
            <MetallicMembershipCard variant={levelKey} usePactLogo />
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name">
              {currentType === "business" ? "Company name" : "Full name"}
            </Label>
            <Input
              id="full_name"
              type="text"
              placeholder={currentType === "business" ? "Your company" : "Your name"}
              value={formData.full_name}
              onChange={(e) => onFormChange({ full_name: e.target.value })}
              required
              className="bg-background"
            />
            {step < 2 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => goToStep(2)}
                disabled={!canProceedFrom1}
              >
                Continue
              </Button>
            )}
          </div>

          {/* Step 2: Email */}
          {step >= 2 && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => onFormChange({ email: e.target.value })}
                required
                className="bg-background"
              />
              {step < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => goToStep(3)}
                  disabled={!canProceedFrom2}
                >
                  Continue
                </Button>
              )}
            </div>
          )}

          {/* Step 3: Password */}
          {step >= 3 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => onFormChange({ password: e.target.value })}
                  required
                  minLength={6}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirm password</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password_confirm}
                  onChange={(e) => onFormChange({ password_confirm: e.target.value })}
                  required
                  minLength={6}
                  className="bg-background"
                />
                {confirmError && (
                  <p className="text-sm text-destructive">{confirmError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Creating account..." : "Create account"}
              </Button>
            </>
          )}
        </form>

        {step >= 2 && (
          <button
            type="button"
            className="mt-4 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStep(step === 3 ? 2 : 1)}
          >
            Back
          </button>
        )}
      </motion.div>
    </section>
  );
}
