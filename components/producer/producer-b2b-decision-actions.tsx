"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  B2bPalletStatusWine,
  B2bWineDecisionStatus,
} from "@/lib/b2b-pallet-producer-status";

type DraftDecision = {
  decisionStatus: Exclude<B2bWineDecisionStatus, "pending"> | null;
  rejectReason: string;
};

type DecisionProps = {
  shipmentId: string;
  wines: B2bPalletStatusWine[];
  /** When false, table is read-only status badges. */
  editable?: boolean;
  /** Opaque share-link token for unauthenticated producer access. */
  accessToken?: string | null;
};

function producerStatusHeaders(accessToken?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) headers["x-b2b-pallet-token"] = accessToken;
  return headers;
}

export function ProducerB2bWineTable({
  shipmentId,
  wines,
  editable = false,
  accessToken = null,
}: DecisionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, DraftDecision>>(() => {
    const initial: Record<string, DraftDecision> = {};
    for (const w of wines) {
      initial[w.wineId] = {
        decisionStatus:
          w.decisionStatus === "pending" ? null : w.decisionStatus,
        rejectReason: w.rejectReason ?? "",
      };
    }
    return initial;
  });

  const isReady = (source: Record<string, DraftDecision>) =>
    wines.every((w) => {
      const d = source[w.wineId];
      if (!d?.decisionStatus) return false;
      if (d.decisionStatus === "declined" && !d.rejectReason.trim()) {
        return false;
      }
      return true;
    });

  const submit = async (overrides?: Record<string, DraftDecision>) => {
    const source = overrides ?? drafts;
    if (!isReady(source)) {
      toast.error("Confirm or reject each wine, and add a reason for rejects");
      return;
    }
    setSaving(true);
    try {
      const wine_decisions = wines.map((w) => {
        const d = source[w.wineId]!;
        return {
          wine_id: w.wineId,
          decision_status: d.decisionStatus!,
          confirmed_quantity:
            d.decisionStatus === "confirmed" ? w.quantity : 0,
          reject_reason:
            d.decisionStatus === "declined" ? d.rejectReason.trim() : null,
        };
      });

      const res = await fetch(`/api/producer/b2b-pallets/${shipmentId}/status`, {
        method: "PATCH",
        headers: producerStatusHeaders(accessToken),
        body: JSON.stringify({ wine_decisions }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not update status");
      toast.success("Order decision saved");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update status",
      );
    } finally {
      setSaving(false);
    }
  };

  const setDecision = (
    wineId: string,
    decisionStatus: Exclude<B2bWineDecisionStatus, "pending">,
  ) => {
    const next: Record<string, DraftDecision> = {
      ...drafts,
      [wineId]: {
        decisionStatus,
        rejectReason:
          decisionStatus === "confirmed"
            ? ""
            : drafts[wineId]?.rejectReason ?? "",
      },
    };
    setDrafts(next);
    if (decisionStatus === "confirmed" && isReady(next)) {
      void submit(next);
    }
  };

  const setReason = (wineId: string, rejectReason: string) => {
    setDrafts((prev) => ({
      ...prev,
      [wineId]: {
        decisionStatus: prev[wineId]?.decisionStatus ?? null,
        rejectReason,
      },
    }));
  };

  const commitReason = (wineId: string, rejectReason: string) => {
    const next: Record<string, DraftDecision> = {
      ...drafts,
      [wineId]: {
        decisionStatus: drafts[wineId]?.decisionStatus ?? null,
        rejectReason,
      },
    };
    setDrafts(next);
    if (isReady(next)) {
      void submit(next);
    }
  };

  const confirmAll = () => {
    const next: Record<string, DraftDecision> = {};
    for (const w of wines) {
      next[w.wineId] = { decisionStatus: "confirmed", rejectReason: "" };
    }
    setDrafts(next);
    void submit(next);
  };

  return (
    <div className="space-y-3">
      {editable ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={saving}
            onClick={() => void confirmAll()}
          >
            {saving ? "Saving…" : "Confirm all"}
          </Button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[24rem] text-left text-sm">
          <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2 font-medium">Wine</th>
              <th className="px-3 py-2 font-medium tabular-nums">Qty</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {wines.map((w) => {
              const d = drafts[w.wineId];
              const status = editable
                ? (d?.decisionStatus ?? null)
                : w.decisionStatus === "pending"
                  ? null
                  : w.decisionStatus;
              const qtyLabel =
                w.decisionStatus === "confirmed" &&
                w.confirmedQuantity != null &&
                w.confirmedQuantity !== w.quantity
                  ? `${w.confirmedQuantity}/${w.quantity}`
                  : String(w.quantity);

              return (
                <tr
                  key={w.wineId}
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-3 py-2.5 text-gray-900">
                    {w.wineName}
                    {w.vintage ? ` ${w.vintage}` : ""}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-gray-700">
                    {qtyLabel}
                  </td>
                  <td className="px-3 py-2.5">
                    {editable ? (
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-7 rounded-full px-2.5 text-xs",
                              status === "confirmed" &&
                                "border-emerald-600 bg-emerald-50 text-emerald-800",
                            )}
                            disabled={saving}
                            onClick={() => setDecision(w.wineId, "confirmed")}
                          >
                            Confirm
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-7 rounded-full px-2.5 text-xs",
                              status === "declined" &&
                                "border-red-500 bg-red-50 text-red-800",
                            )}
                            disabled={saving}
                            onClick={() => setDecision(w.wineId, "declined")}
                          >
                            Reject
                          </Button>
                          {status == null ? (
                            <span className="text-xs text-amber-800">
                              Pending
                            </span>
                          ) : null}
                        </div>
                        {status === "declined" ? (
                          <Input
                            value={d?.rejectReason ?? ""}
                            onChange={(e) =>
                              setReason(w.wineId, e.target.value)
                            }
                            onBlur={(e) =>
                              commitReason(w.wineId, e.target.value)
                            }
                            placeholder="Why is this wine rejected?"
                            className="h-8 max-w-md text-sm"
                            disabled={saving}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <span
                        className={cn(
                          "inline-flex max-w-full flex-wrap items-baseline gap-x-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          w.decisionStatus === "confirmed" &&
                            "bg-emerald-50 text-emerald-800",
                          w.decisionStatus === "declined" &&
                            "bg-red-50 text-red-800",
                          w.decisionStatus === "pending" &&
                            "bg-amber-50 text-amber-900",
                        )}
                      >
                        <span className="capitalize">
                          {w.decisionStatus === "declined"
                            ? "Rejected"
                            : w.decisionStatus}
                        </span>
                        {w.decisionStatus === "declined" && w.rejectReason ? (
                          <span className="font-normal opacity-90">
                            · {w.rejectReason}
                          </span>
                        ) : null}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** @deprecated Use ProducerB2bWineTable with editable */
export function ProducerB2bDecisionActions(props: DecisionProps) {
  return <ProducerB2bWineTable {...props} editable />;
}

type HubDeliveryProps = {
  shipmentId: string;
  hubName?: string | null;
  accessToken?: string | null;
};

export function ProducerB2bHubDeliveryActions({
  shipmentId,
  hubName,
  accessToken = null,
}: HubDeliveryProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const confirmHubDelivery = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/b2b-pallets/${shipmentId}/status`, {
        method: "PATCH",
        headers: producerStatusHeaders(accessToken),
        body: JSON.stringify({
          delivered_to_hub_at: new Date().toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Could not update status");
      toast.success("Hub delivery confirmed");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update status",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
      <p className="mr-auto text-sm text-amber-900">
        Confirm when goods have been delivered
        {hubName ? ` to ${hubName}` : " to the consolidation hub"}.
      </p>
      <Button
        type="button"
        size="sm"
        className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
        disabled={saving}
        onClick={() => void confirmHubDelivery()}
      >
        {saving ? "Confirming…" : "Confirm"}
      </Button>
    </div>
  );
}
