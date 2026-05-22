import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/** Shared layout + type for Pricing + How PACT sections on invite landing. */
export const inviteStory = {
  outer: "invite-pact-story bg-background border-t border-border/80",
  container: "max-w-3xl mx-auto px-6",
  part: "py-16 md:py-20 first:pt-24 md:first:pt-28 last:pb-24 md:last:pb-28",
  partDivider: "border-t border-border",
  eyebrow:
    "invite-eyebrow uppercase mb-4 text-center",
  heading:
    "text-2xl md:text-4xl lg:text-5xl font-sans leading-tight text-foreground text-center tracking-tight",
  subheading:
    "mt-4 text-sm md:text-base text-muted-foreground leading-relaxed text-center max-w-lg mx-auto",
  stepList: "divide-y divide-border border-t border-border",
  stepItem: "py-8 first:pt-8",
  stepRow: "flex gap-5",
  stepNum:
    "font-sans text-2xl text-muted-foreground/70 shrink-0 w-10 tabular-nums",
  stepPill:
    "inline-block text-xs font-medium uppercase tracking-wider px-2.5 py-1 rounded-full mb-3",
  stepTitle: "font-sans text-xl md:text-2xl leading-tight text-foreground mb-2",
  stepBody: "text-sm text-muted-foreground leading-relaxed",
  callout:
    "mt-4 pl-4 border-l-2 border-border text-sm text-muted-foreground leading-relaxed",
  calloutLabel: "text-foreground font-medium",
  card: "rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm",
  cardHighlight: "rounded-xl border border-border bg-card p-6 sm:p-8",
  accentBanner:
    "rounded-xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8",
  heroNumber: "font-sans font-semibold tabular-nums text-foreground",
  mutedNumber: "font-sans text-xl text-foreground tabular-nums",
} as const;

export const inviteStoryPills = {
  secondary: "bg-muted text-foreground border border-border",
  muted: "bg-muted text-foreground border border-border",
  accent: "bg-muted text-foreground border border-border",
  primary: "bg-muted text-foreground border border-border",
} as const;

export function InviteStoryHeader({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("text-center mb-12 md:mb-14", className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className={inviteStory.eyebrow}>{eyebrow}</p>
      <h2 className={inviteStory.heading}>{title}</h2>
      <p className={inviteStory.subheading}>{subtitle}</p>
    </motion.div>
  );
}
