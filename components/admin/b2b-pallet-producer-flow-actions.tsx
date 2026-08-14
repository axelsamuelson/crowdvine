"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import type {
  B2bPalletStatusWine,
  B2bWineDecisionStatus,
} from "@/lib/b2b-pallet-producer-status";

type DraftDecision = {
  decisionStatus: Exclude<B2bWineDecisionStatus, "pending"> | null;
  rejectReason: string;
};

async function patchStatus(payload: Record<string, unknown>) {
  const res = await fetch("/api/admin/b2b-pallet-producer-status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || "Kunde inte uppdatera status");
  }
  return json;
}

type StepActionProps = {
  shipmentId: string;
  producerId: string;
  wines: B2bPalletStatusWine[];
  orderSentAt: string | null;
  /** Awaiting wine confirm/reject (Confirm step). */
  awaitingConfirm: boolean;
  /** Confirmed/partial and not yet hub-delivered. */
  awaitingHubDelivery: boolean;
};

export function AdminB2bProducerStepAction({
  shipmentId,
  producerId,
  wines,
  orderSentAt,
  awaitingConfirm,
  awaitingHubDelivery,
}: StepActionProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const confirmAll = async () => {
    setSaving(true);
    try {
      const wine_decisions = wines.map((w) => ({
        wine_id: w.wineId,
        decision_status: "confirmed" as const,
        confirmed_quantity: w.quantity,
        reject_reason: null,
      }));
      await patchStatus({
        shipment_id: shipmentId,
        producer_id: producerId,
        wine_decisions,
        ...(!orderSentAt ? { order_sent_at: new Date().toISOString() } : {}),
      });
      toast.success("Vinbeslut sparade");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  const confirmHubDelivery = async () => {
    setSaving(true);
    try {
      await patchStatus({
        shipment_id: shipmentId,
        producer_id: producerId,
        delivered_to_hub_at: new Date().toISOString(),
      });
      toast.success("Hub Delivery bekräftad");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  if (awaitingConfirm) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "h-8 text-xs font-medium")}
        disabled={saving || wines.length === 0}
        onClick={() => void confirmAll()}
      >
        {saving ? "Sparar…" : "Bekräfta alla"}
      </Button>
    );
  }

  if (awaitingHubDelivery) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 rounded-lg border-amber-500 bg-transparent text-xs font-medium text-amber-700 hover:bg-amber-50 hover:text-amber-800 dark:border-amber-500 dark:text-amber-400 dark:hover:bg-amber-500/10 dark:hover:text-amber-300"
        disabled={saving}
        onClick={() => void confirmHubDelivery()}
      >
        {saving ? "Sparar…" : "Confirm Hub Delivery"}
      </Button>
    );
  }

  return null;
}

/** @deprecated Use AdminB2bProducerStepAction */
export function AdminB2bConfirmAllButton(
  props: Omit<
    StepActionProps,
    "awaitingConfirm" | "awaitingHubDelivery"
  > & { awaitingConfirm?: boolean },
) {
  return (
    <AdminB2bProducerStepAction
      {...props}
      awaitingConfirm={props.awaitingConfirm ?? true}
      awaitingHubDelivery={false}
    />
  );
}

type Props = {
  shipmentId: string;
  producerId: string;
  wines: B2bPalletStatusWine[];
  orderSentAt: string | null;
  deliveredToHubAt: string | null;
};

export function AdminB2bProducerFlowActions({
  shipmentId,
  producerId,
  wines,
  orderSentAt,
  deliveredToHubAt,
}: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
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

  const submitDecisions = async (
    overrides?: Record<string, DraftDecision>,
  ) => {
    const source = overrides ?? drafts;
    if (!isReady(source)) {
      toast.error("Bekräfta eller avvisa varje vin, och ange orsak vid avslag");
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

      await patchStatus({
        shipment_id: shipmentId,
        producer_id: producerId,
        wine_decisions,
        ...(!orderSentAt ? { order_sent_at: new Date().toISOString() } : {}),
      });
      toast.success("Vinbeslut sparade");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
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
      void submitDecisions(next);
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
      void submitDecisions(next);
    }
  };

  const markOrderSent = async () => {
    setSaving(true);
    try {
      await patchStatus({
        shipment_id: shipmentId,
        producer_id: producerId,
        order_sent_at: new Date().toISOString(),
      });
      toast.success("Order markerad som skickad");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  const clearHubDelivery = async () => {
    setSaving(true);
    try {
      await patchStatus({
        shipment_id: shipmentId,
        producer_id: producerId,
        delivered_to_hub_at: null,
      });
      toast.success("Hub Delivery ångrad");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm dark:border-[#1F1F23] dark:bg-zinc-900/40"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-zinc-400",
            expanded && "rotate-90",
          )}
          aria-hidden
        />
        <span className="font-medium text-gray-900 dark:text-zinc-100">
          Viner
        </span>
        <span className="tabular-nums text-gray-500 dark:text-zinc-400">
          {wines.length}
        </span>
      </button>

      {expanded ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#1F1F23]">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-[#1F1F23] dark:bg-zinc-900/50 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">Vin</th>
                <th className="px-3 py-2 font-medium tabular-nums">Antal</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {wines.map((w) => {
                const d = drafts[w.wineId];
                const status = d?.decisionStatus ?? null;
                const qtyLabel =
                  w.decisionStatus === "confirmed" &&
                  w.confirmedQuantity != null &&
                  w.confirmedQuantity !== w.quantity
                    ? `${w.confirmedQuantity}/${w.quantity}`
                    : String(w.quantity);

                return (
                  <tr
                    key={w.wineId}
                    className="border-b border-gray-50 last:border-0 dark:border-[#1F1F23]"
                  >
                    <td className="px-3 py-2.5 text-gray-900 dark:text-zinc-100">
                      {w.vintage ? `${w.wineName} ${w.vintage}` : w.wineName}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-gray-700 dark:text-zinc-300">
                      {qtyLabel}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={cn(
                              "h-7 rounded-full px-2.5 text-xs",
                              status === "confirmed" &&
                                "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
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
                                "border-red-500 bg-red-50 text-red-800 dark:bg-red-500/15 dark:text-red-300",
                            )}
                            disabled={saving}
                            onClick={() => setDecision(w.wineId, "declined")}
                          >
                            Reject
                          </Button>
                          {status == null ? (
                            <span className="text-xs text-amber-700 dark:text-amber-300">
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
                            placeholder="Orsak till avslag"
                            className="h-8 max-w-md text-sm"
                            disabled={saving}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {!orderSentAt ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              ADMIN_OUTLINE_BUTTON_CLASS,
              "h-8 text-xs font-medium",
            )}
            disabled={saving}
            onClick={() => void markOrderSent()}
          >
            Markera Order sent
          </Button>
        ) : null}
        {deliveredToHubAt ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              ADMIN_OUTLINE_BUTTON_CLASS,
              "h-8 text-xs font-medium",
            )}
            disabled={saving}
            onClick={() => void clearHubDelivery()}
          >
            Ångra Hub Delivery
          </Button>
        ) : null}
      </div>
    </div>
  );
}
