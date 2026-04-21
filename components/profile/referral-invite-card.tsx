"use client";

import { useCallback, useState } from "react";
import { Link2, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REFERRAL_REWARD_HEADLINE } from "@/lib/referral/constants";
import { cn } from "@/lib/utils";

export interface ReferralInviteCardProps {
  inviteUrl: string;
  invitedCount: number;
  activatedCount: number;
  className?: string;
}

export function ReferralInviteCard({
  inviteUrl,
  invitedCount,
  activatedCount,
  className,
}: ReferralInviteCardProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }, [inviteUrl]);

  const shareLink = useCallback(async () => {
    if (!inviteUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join me on PACT",
          text: "Get access with my invite link.",
          url: inviteUrl,
        });
      } else {
        await copyLink();
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        void copyLink();
      }
    }
  }, [inviteUrl, copyLink]);

  return (
    <section
      id="referral"
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
          <Link2 className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Invite friends
          </h2>
          <p className="text-xs text-muted-foreground">
            Your personal link never expires — share it anytime.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-2.5">
        <p className="break-all text-sm font-mono text-foreground">{inviteUrl || "—"}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => void copyLink()}
          disabled={!inviteUrl}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy link
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-2 bg-black text-white hover:bg-black/90"
          onClick={() => void shareLink()}
          disabled={!inviteUrl}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      <div className="mt-5 space-y-2 rounded-xl bg-muted/40 px-4 py-3 text-sm text-foreground">
        <p className="font-medium text-foreground">What you get</p>
        <p className="text-muted-foreground leading-snug">{REFERRAL_REWARD_HEADLINE}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
        <div>
          <span className="font-semibold tabular-nums text-foreground">{invitedCount}</span>
          <span className="ml-1.5 text-muted-foreground">friends invited</span>
        </div>
        <div>
          <span className="font-semibold tabular-nums text-foreground">{activatedCount}</span>
          <span className="ml-1.5 text-muted-foreground">placed their first qualifying order</span>
        </div>
      </div>
    </section>
  );
}
