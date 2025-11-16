"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, UserPlus2 } from "lucide-react";
import type { Product } from "@/lib/shopify/types";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

type FollowStub = {
  id: string;
  full_name?: string;
  email?: string;
};

type SharedBoxDialogProps = {
  product: Pick<Product, "id" | "title" | "producerName" | "producerId">;
  trigger?: React.ReactNode;
};

export function SharedBoxDialog({ product, trigger }: SharedBoxDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState<FollowStub[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!open) return;

    fetch("/api/profile/follow")
      .then((res) => res.json())
      .then((data) => setFollowing(data.following ?? []))
      .catch(() => setFollowing([]));
  }, [open]);

  const handleToggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const displayName = (profile: FollowStub) =>
    profile.full_name || profile.email || "Member";

  const canSubmit = quantity > 0;

  const selectedParticipants = useMemo(
    () =>
      following.filter((profile) => selected.includes(profile.id)),
    [following, selected],
  );

  const handleStart = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const response = await fetch("/api/shared-boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producerId: product.producerId,
          producerName: product.producerName,
          wineId: product.id,
          inviteeIds: selected,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start shared box");
      }

      const payload = await response.json();

      AnalyticsTracker.trackSharedBoxCreated({
        sharedBoxId: payload.sharedBoxId,
        producerId: product.producerId,
        producerName: product.producerName,
        inviteeCount: selected.length,
        initialQuantity: quantity,
      });

      if (selected.length > 0) {
        AnalyticsTracker.trackSharedBoxInvite({
          sharedBoxId: payload.sharedBoxId,
          inviteeCount: selected.length,
        });
      }

      setOpen(false);
      setSelected([]);
      toast.success("Shared box created — invite sent!");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't start shared box. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full rounded-full">
            <UserPlus2 className="mr-2 h-4 w-4" />
            Start shared box
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share this box</DialogTitle>
          <DialogDescription>
            Invite trusted members to co-reserve bottles from{" "}
            {product.producerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Selected wine
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {product.title}
            </p>
            {product.producerName && (
              <p className="text-xs text-gray-500">{product.producerName}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Your contribution (bottles)
            </label>
            <Input
              type="number"
              min={1}
              max={6}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-2"
            />
            <p className="mt-1 text-xs text-gray-500">
              Each producer requires 6 bottles per box. Split the minimum with
              friends.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Invite friends
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedParticipants.map((participant) => (
                <Badge
                  key={participant.id}
                  className="rounded-full"
                  variant="secondary"
                >
                  {displayName(participant)}
                </Badge>
              ))}
              {selectedParticipants.length === 0 && (
                <p className="text-xs text-gray-500">
                  Select contacts below to split the box.
                </p>
              )}
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-white/50 p-2">
              {following.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => handleToggle(profile.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${selected.includes(profile.id) ? "bg-gray-900 text-white" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                >
                  <span>{displayName(profile)}</span>
                  {selected.includes(profile.id) && <span>Added</span>}
                </button>
              ))}
              {following.length === 0 && (
                <p className="text-xs text-gray-500 px-3 py-2">
                  Follow members from your profile to invite them.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full rounded-full"
            disabled={!canSubmit || loading}
            onClick={handleStart}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start shared box
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

