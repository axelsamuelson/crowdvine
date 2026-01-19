"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

type Friend = {
  id: string;
  full_name?: string;
  avatar_image_path?: string;
  description?: string;
};

export type ShareAllocation = Record<string, Record<string, number>>;

type CartLine = {
  id: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

function clampInt(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function formatMoney(amount: number, currencyCode: string) {
  const rounded = Math.round(amount);
  return `${rounded} ${currencyCode}`;
}

function formatInitials(name?: string) {
  if (!name) return "U";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface ShareBottlesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  currencyCode: string;
  discountRate: number; // 0..1
  cartLines: CartLine[];
  onConfirm: (payload: { selectedFriends: Friend[]; allocations: ShareAllocation }) => void;
}

export function ShareBottlesDialog({
  open,
  onOpenChange,
  userId,
  currencyCode,
  discountRate,
  cartLines,
  onConfirm,
}: ShareBottlesDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allocations, setAllocations] = useState<ShareAllocation>({});

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setQuery("");
    setSelectedIds(new Set());
    setAllocations({});

    const run = async () => {
      if (!userId) {
        toast.error("Could not load your following list.");
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/user/follow/list?userId=${userId}&type=following`);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Failed to load following list");
        }
        const data = await res.json();
        setFriends((data?.users || []) as Friend[]);
      } catch (e: any) {
        console.error("[ShareBottles] Failed to load friends:", e);
        toast.error(e?.message || "Failed to load friends");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [open, userId]);

  const selectedFriends = useMemo(
    () => friends.filter((f) => selectedIds.has(f.id)),
    [friends, selectedIds],
  );

  const filteredFriends = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => (f.full_name || "").toLowerCase().includes(q));
  }, [friends, query]);

  const totalsPerLine = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const friendId of Object.keys(allocations)) {
      const perLine = allocations[friendId] || {};
      for (const lineId of Object.keys(perLine)) {
        totals[lineId] = (totals[lineId] || 0) + (perLine[lineId] || 0);
      }
    }
    return totals;
  }, [allocations]);

  const clampedDiscountRate = useMemo(() => {
    if (!Number.isFinite(discountRate)) return 0;
    return Math.max(0, Math.min(1, discountRate));
  }, [discountRate]);

  const costBreakdown = useMemo(() => {
    const lineById = new Map(cartLines.map((l) => [l.id, l]));
    const totals: Record<string, { raw: number; net: number }> = {};

    for (const friendId of Object.keys(allocations)) {
      let raw = 0;
      const perLine = allocations[friendId] || {};
      for (const [lineId, qty] of Object.entries(perLine)) {
        const line = lineById.get(lineId);
        if (!line) continue;
        const q = Math.max(0, Math.floor(Number(qty) || 0));
        raw += q * (Number(line.unitPrice) || 0);
      }
      const net = raw * (1 - clampedDiscountRate);
      totals[friendId] = { raw, net };
    }

    // You = remainder (what isn't assigned to friends)
    let youRaw = 0;
    for (const line of cartLines) {
      const assigned = totalsPerLine[line.id] || 0;
      const remainder = Math.max(0, (line.quantity || 0) - assigned);
      youRaw += remainder * (Number(line.unitPrice) || 0);
    }
    const youNet = youRaw * (1 - clampedDiscountRate);

    return { byFriendId: totals, you: { raw: youRaw, net: youNet } };
  }, [allocations, cartLines, clampedDiscountRate, totalsPerLine]);

  const canContinue = selectedIds.size > 0;

  const canConfirm = useMemo(() => {
    if (selectedFriends.length === 0) return false;
    // Must allocate at least 1 bottle in total
    const totalAllocated = Object.values(totalsPerLine).reduce((s, n) => s + n, 0);
    if (totalAllocated <= 0) return false;
    // Must not exceed per-line quantity
    for (const line of cartLines) {
      if ((totalsPerLine[line.id] || 0) > line.quantity) return false;
    }
    return true;
  }, [cartLines, selectedFriends.length, totalsPerLine]);

  const toggleFriend = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setQty = (friendId: string, lineId: string, qty: number) => {
    setAllocations((prev) => {
      const next = { ...prev };
      const friendAlloc = { ...(next[friendId] || {}) };
      friendAlloc[lineId] = qty;
      next[friendId] = friendAlloc;
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Share bottles" : "Assign bottles"}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people you follow"
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white">
              <ScrollArea className="h-[320px]">
                <div className="p-3 space-y-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading…
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="py-10 text-center text-sm text-gray-500">
                      No people found.
                    </div>
                  ) : (
                    filteredFriends.map((f) => {
                      const checked = selectedIds.has(f.id);
                      const avatarUrl = f.avatar_image_path || "";
                      return (
                        <div
                          key={f.id}
                          onClick={() => toggleFriend(f.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleFriend(f.id);
                            }
                          }}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          className="w-full flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-2 text-left"
                        >
                          <div
                            aria-hidden="true"
                            className="h-5 w-5 rounded-[6px] border border-gray-300 bg-white flex items-center justify-center"
                          >
                            {checked ? (
                              <Check className="h-3.5 w-3.5 text-gray-900" />
                            ) : null}
                          </div>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarUrl} alt={f.full_name || "User"} />
                            <AvatarFallback>{formatInitials(f.full_name)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {f.full_name || "User"}
                            </div>
                            {f.description ? (
                              <div className="text-xs text-gray-500 truncate">
                                {f.description}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-black text-white hover:bg-black/90"
                disabled={!canContinue}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Choose how many bottles to assign to each friend. Totals per bottle can’t exceed what you reserved.
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Cost breakdown
                  </div>
                  <div className="text-xs text-gray-500">
                    Bottle cost{clampedDiscountRate > 0 ? " (after discount)" : ""}. Shipping not split.
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {clampedDiscountRate > 0
                    ? `Discount: ${(clampedDiscountRate * 100).toFixed(1)}%`
                    : null}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {selectedFriends.map((f) => {
                  const t = costBreakdown.byFriendId[f.id] || { raw: 0, net: 0 };
                  return (
                    <div key={f.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 truncate pr-4">
                        {f.full_name || "User"}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatMoney(t.net, currencyCode)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-700">You</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(costBreakdown.you.net, currencyCode)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white">
              <ScrollArea className="h-[360px]">
                <div className="p-4 space-y-6">
                  {selectedFriends.map((friend) => (
                    <div key={friend.id} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={friend.avatar_image_path || ""} alt={friend.full_name || "User"} />
                          <AvatarFallback>{formatInitials(friend.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {friend.full_name || "User"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatMoney(
                              (costBreakdown.byFriendId[friend.id]?.net || 0),
                              currencyCode,
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {cartLines.map((line) => {
                          const alreadyAllocated = (totalsPerLine[line.id] || 0) - ((allocations[friend.id]?.[line.id] || 0));
                          const remainingForThisFriend = Math.max(0, line.quantity - alreadyAllocated);
                          const current = allocations[friend.id]?.[line.id] || 0;
                          return (
                            <div key={line.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                              <div className="min-w-0">
                                <div className="text-sm text-gray-900 truncate">{line.title}</div>
                                <div className="text-xs text-gray-500">
                                  Reserved: {line.quantity} • Assigned: {totalsPerLine[line.id] || 0}
                                </div>
                              </div>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={remainingForThisFriend}
                                value={current}
                                onChange={(e) => {
                                  const v = clampInt(Number(e.target.value), 0, remainingForThisFriend);
                                  setQty(friend.id, line.id, v);
                                }}
                                className="w-24 text-right"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                type="button"
                className="rounded-full bg-black text-white hover:bg-black/90"
                disabled={!canConfirm}
                onClick={() => {
                  onConfirm({ selectedFriends, allocations });
                  onOpenChange(false);
                  toast.success("Share set up");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


