"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getLevelInfo } from "@/lib/membership/points-engine";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { MembershipCardsGrid } from "@/components/invite-landing/metallic-membership-card";

export type InvitationType = "consumer" | "producer" | "business";

export interface InvitationFormData {
  full_name: string;
  email: string;
  password: string;
  password_confirm: string;
  selected_type?: InvitationType | null;
}

type FormStep = 1 | 2 | 3;

interface InvitationTypeSectionProps {
  /** Types the user can sign up as. */
  allowedTypes: InvitationType[];
  /** Default type when user cannot change. */
  defaultType: InvitationType;
  /** If true, user can switch between allowed types. */
  canChangeAccountType: boolean;
  /** Membership level from invitation – only this card is shown. */
  initialMembershipLevel?: string | null;
  /** Name of the person who sent the invitation. */
  inviterName?: string | null;
  /** When set, user has signed up – show welcome state instead of invitation. */
  welcomeName?: string | null;
  formData: InvitationFormData;
  onFormChange: (data: Partial<InvitationFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

const INVITATION_TYPE_LABELS: Record<InvitationType, string> = {
  consumer: "Consumer",
  producer: "Producer",
  business: "Business",
};

const INVITATION_OPTIONS: { value: InvitationType; label: string; description: string }[] = [
  {
    value: "consumer",
    label: "Consumer",
    description: "Reserve wines, share pallets, discover producers.",
  },
  {
    value: "producer",
    label: "Producer",
    description: "List your wines and reach the community.",
  },
  {
    value: "business",
    label: "Business",
    description: "Access B2B portal and trade offerings.",
  },
];

const STEPS: { n: FormStep; title: string }[] = [
  { n: 1, title: "Name" },
  { n: 2, title: "Email" },
  { n: 3, title: "Password" },
];

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
}: InvitationTypeSectionProps) {
  const [step, setStep] = useState<FormStep>(1);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const currentType =
    canChangeAccountType && formData.selected_type && allowedTypes.includes(formData.selected_type)
      ? formData.selected_type
      : defaultType;

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

  const validLevels = ["basic", "brons", "silver", "guld", "privilege"] as const;
  const levelKey =
    initialMembershipLevel && validLevels.includes(initialMembershipLevel as (typeof validLevels)[number])
      ? (initialMembershipLevel as (typeof validLevels)[number])
      : "basic";
  const membershipLevelName = getLevelInfo(levelKey).name;
  const inviterDisplayName = inviterName?.trim() || "a member";
  const isWelcome = !!welcomeName?.trim();
  const displayName = welcomeName ? toTitleCase(welcomeName) : "";
  const invitationSectionRef = useRef<HTMLElement>(null);
  const hasScrolledToCard = useRef(false);

  useEffect(() => {
    if (welcomeName && !hasScrolledToCard.current) {
      hasScrolledToCard.current = true;
      invitationSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [welcomeName]);

  return (
    <>
      {/* Section 1: Your invitation / Welcome – medlemskapsnivåer som metalliska kort */}
      <section ref={invitationSectionRef} className="bg-[#1F090E] px-6 py-24 invitation-section-platform scroll-mt-24">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center md:gap-12 lg:gap-16">
          <div className="mb-10 md:mb-0 md:flex-shrink-0 md:w-80 lg:w-96">
            <AnimatePresence mode="wait">
              <motion.p
                key={isWelcome ? "welcome-label" : "invitation-label"}
                className="text-white/70 text-sm uppercase tracking-widest mb-2 font-sans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {isWelcome ? "Welcome" : "Your invitation"}
              </motion.p>
              <motion.h2
                key={isWelcome ? "welcome-text" : "invitation-text"}
                className="text-white text-2xl md:text-3xl font-medium font-sans"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {isWelcome ? (
                  <>
                    {displayName}, you are now a member of PACT.
                  </>
                ) : (
                  <>
                    You&apos;ve been invited by {inviterDisplayName} and given a{" "}
                    <span className={`invitation-level-name invitation-level-${levelKey}`}>
                      {membershipLevelName}
                    </span>{" "}
                    membership
                  </>
                )}
              </motion.h2>
              {isWelcome && (
                <motion.div
                  key="welcome-button"
                  className="mt-6"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Button
                    asChild
                    className="bg-white text-[#1F090E] hover:bg-white/90 font-sans px-8"
                  >
                    <Link href="/">Go to the platform</Link>
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 min-w-0">
            <MembershipCardsGrid
              initialMembershipLevel={initialMembershipLevel}
              memberName={isWelcome ? displayName : null}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Create your account (stepper + form) – hidden when welcome */}
      {!isWelcome && (
      <section id="create-account" className="bg-background px-6 py-24 invitation-section-platform">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
          <motion.p
            className="text-muted-foreground text-sm uppercase tracking-widest mb-2 font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Create your account
          </motion.p>

          {/* Stepper tabs - like checkout */}
          <motion.div
            className="mt-6 grid grid-cols-3 gap-2 font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {STEPS.map((s) => {
              const isActive = step === s.n;
              const isComplete = step > s.n;
              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => goToStep(s.n)}
                  className={`w-full rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "border-foreground bg-background"
                      : "border-border bg-secondary hover:bg-secondary/80"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                        isComplete
                          ? "bg-foreground text-background"
                          : isActive
                            ? "bg-foreground text-background"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.n}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {s.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </motion.div>

          {/* Single-question form - one step at a time */}
          <motion.form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 1 && canProceedFrom1) goToStep(2);
              else if (step === 2 && canProceedFrom2) goToStep(3);
              else if (step === 3) handleSubmit(e);
            }}
            className="mt-6 bg-secondary rounded-xl border border-border p-6 md:p-8 shadow-sm font-sans"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
          {step > 1 && (
            <div className="mb-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-0 text-muted-foreground hover:text-foreground font-sans"
                onClick={() => setStep((step - 1) as FormStep)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          )}

          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-6">
              <Label htmlFor="invite-full_name" className="text-lg font-sans font-medium text-foreground">
                What is your name?
              </Label>
              <Input
                id="invite-full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => onFormChange({ full_name: e.target.value })}
                placeholder="Your name"
                required
                className="mt-2 text-base"
              />
              <Button
                type="submit"
                disabled={!canProceedFrom1}
                className="w-full md:w-auto bg-foreground text-background hover:bg-foreground/90 font-sans"
              >
                Next
              </Button>
            </div>
          )}

          {/* Step 2: Email */}
          {step === 2 && (
            <div className="space-y-6">
              <Label htmlFor="invite-email" className="text-lg font-sans font-medium text-foreground">
                What is your email?
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={formData.email}
                onChange={(e) => onFormChange({ email: e.target.value })}
                placeholder="you@example.com"
                required
                className="mt-2 text-base"
              />
              <Button
                type="submit"
                disabled={!canProceedFrom2}
                className="w-full md:w-auto bg-foreground text-background hover:bg-foreground/90 font-sans"
              >
                Next
              </Button>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <div className="space-y-6">
              <Label htmlFor="invite-password" className="text-lg font-sans font-medium text-foreground">
                Choose a password
              </Label>
              <Input
                id="invite-password"
                type="password"
                value={formData.password}
                onChange={(e) => {
                  onFormChange({ password: e.target.value });
                  if (confirmError) setConfirmError(null);
                }}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="mt-2 text-base"
              />
              <Label htmlFor="invite-password_confirm" className="text-foreground font-sans">
                Confirm password
              </Label>
              <Input
                id="invite-password_confirm"
                type="password"
                value={formData.password_confirm}
                onChange={(e) => {
                  onFormChange({ password_confirm: e.target.value });
                  if (confirmError) setConfirmError(null);
                }}
                placeholder="Same as above"
                required
                className="mt-1.5 text-base"
              />
              {confirmError && (
                <p className="text-sm text-destructive font-sans">{confirmError}</p>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto bg-foreground text-background hover:bg-foreground/90 font-sans"
              >
                {submitting ? "Creating account…" : "Confirm"}
              </Button>
            </div>
          )}
          </motion.form>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      )}
    </>
  );
}
