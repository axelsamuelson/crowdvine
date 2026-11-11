"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Trash2, Plus, MapPin, Calendar } from "lucide-react";
import {
  allowedDispatchTransitions,
  DISPATCH_STATUS_LABELS_SV,
  normalizeDispatchStatus,
  type DirectBoxDispatchStatus,
} from "@/lib/commerce/direct-box-dispatch";
import {
  buildDirectBoxPickList,
  type PickListItemInput,
} from "@/lib/admin/direct-box-pick-list";

export type DirectBoxShipmentRow = {
  id: string;
  source_key: string;
  source_label: string;
  carrier: string;
  tracking_number: string;
  boxes: number;
  created_at?: string;
};

export type DirectBoxFulfillmentPanelProps = {
  reservationId: string;
  orderCreatedAt: string;
  fulfillmentDispatchStatus: string | null;
  deliveredAt: string | null;
  statusUpdatedAt: string | null;
  items: PickListItemInput[];
  shipments: DirectBoxShipmentRow[];
};

export function DirectBoxFulfillmentPanel({
  reservationId,
  orderCreatedAt,
  fulfillmentDispatchStatus,
  deliveredAt,
  statusUpdatedAt,
  items,
  shipments: initialShipments,
}: DirectBoxFulfillmentPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shipments, setShipments] = useState(initialShipments);
  const [deliveredDraft, setDeliveredDraft] = useState(
    deliveredAt ? deliveredAt.slice(0, 16) : "",
  );
  const [trackingDrafts, setTrackingDrafts] = useState<
    Record<string, { tracking: string; boxes: string }>
  >({});

  const current = normalizeDispatchStatus(fulfillmentDispatchStatus);
  const nextStatuses = allowedDispatchTransitions(current);

  const pickList = useMemo(
    () =>
      buildDirectBoxPickList({
        reservationId,
        orderDate: orderCreatedAt,
        items,
      }),
    [reservationId, orderCreatedAt, items],
  );

  async function transitionTo(status: DirectBoxDispatchStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reservations/${reservationId}/fulfillment-dispatch`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Kunde inte uppdatera status (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function saveDeliveredAt() {
    setBusy(true);
    setError(null);
    try {
      const value = deliveredDraft.trim()
        ? new Date(deliveredDraft).toISOString()
        : null;
      const res = await fetch(
        `/api/admin/reservations/${reservationId}/fulfillment-dispatch`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ delivered_at: value }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Kunde inte spara delivered_at");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function saveShipment(sourceKey: string, sourceLabel: string, boxes: number) {
    const draft = trackingDrafts[sourceKey] ?? {
      tracking: "",
      boxes: String(boxes),
    };
    const tracking = draft.tracking.trim();
    if (!tracking) {
      setError("Ange spårningsnummer");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reservations/${reservationId}/shipments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            source_key: sourceKey,
            source_label: sourceLabel,
            carrier: "ups",
            tracking_number: tracking,
            boxes: Math.max(1, parseInt(draft.boxes, 10) || boxes || 1),
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Kunde inte spara spårningsnummer");
        return;
      }
      setShipments((prev) => {
        const rest = prev.filter((s) => s.source_key !== sourceKey);
        return [...rest, json.shipment as DirectBoxShipmentRow];
      });
      setTrackingDrafts((prev) => {
        const next = { ...prev };
        delete next[sourceKey];
        return next;
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function deleteShipment(shipmentId: string) {
    if (!confirm("Ta bort spårningsnummer?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/reservations/${reservationId}/shipments/${shipmentId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Kunde inte ta bort");
        return;
      }
      setShipments((prev) => prev.filter((s) => s.id !== shipmentId));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4" data-testid="direct-box-fulfillment-panel">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Truck className="h-5 w-5" />
            Direktleverans (UPS)
          </CardTitle>
          <CardDescription>
            Status, spårning och plocklista — endast admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-600">Status:</span>
            <Badge variant="secondary" data-testid="dispatch-status">
              {DISPATCH_STATUS_LABELS_SV[current]}
            </Badge>
            {statusUpdatedAt ? (
              <span className="text-xs text-zinc-500">
                uppdaterad {new Date(statusUpdatedAt).toLocaleString("sv-SE")}
              </span>
            ) : null}
          </div>

          {nextStatuses.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={s === "cancelled" || s === "skipped" ? "outline" : "default"}
                  disabled={busy}
                  onClick={() => transitionTo(s)}
                  data-testid={`dispatch-to-${s}`}
                >
                  → {DISPATCH_STATUS_LABELS_SV[s]}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Inga ytterligare övergångar.</p>
          )}

          <Separator />

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="delivered_at">Levererad (delivered_at)</Label>
              <Input
                id="delivered_at"
                type="datetime-local"
                value={deliveredDraft}
                onChange={(e) => setDeliveredDraft(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={saveDeliveredAt}
            >
              Spara datum
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Plocklista
          </CardTitle>
          <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Order: {pickList.orderDateIso}
            </span>
            <span>
              Mål upphämtning: <strong>{pickList.targetPickupIso}</strong> (+3
              arbetsdagar)
            </span>
            <span>
              Senast: <strong>{pickList.latestPickupIso}</strong> (+5
              arbetsdagar)
            </span>
            <span>
              Totalt {pickList.totalBoxes} lådor / {pickList.totalBottles}{" "}
              flaskor
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pickList.sources.length === 0 ? (
            <p className="text-sm text-zinc-500">Inga rader på ordern.</p>
          ) : (
            pickList.sources.map((src) => {
              const shipment = shipments.find((s) => s.source_key === src.sourceKey);
              const draft = trackingDrafts[src.sourceKey] ?? {
                tracking: shipment?.tracking_number ?? "",
                boxes: String(shipment?.boxes ?? src.boxes),
              };
              return (
                <div
                  key={src.sourceKey}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                  data-testid={`pick-source-${src.sourceKey}`}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{src.sourceLabel}</h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {src.boxes} låda{src.boxes === 1 ? "" : "or"} (
                        {src.bottles} flaskor)
                      </p>
                      <p className="mt-1 flex items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{src.pickupAddress}</span>
                      </p>
                    </div>
                    <Badge variant="outline">
                      {src.kind === "wholesaler" ? "Grossist" : "Producent"}
                    </Badge>
                  </div>

                  <ul className="mb-3 space-y-1 text-sm">
                    {src.wines.map((w) => (
                      <li key={w.wineId || w.wineName} className="flex justify-between gap-2">
                        <span>
                          {w.wineName}
                          {w.vintage ? ` (${w.vintage})` : ""}
                        </span>
                        <span className="tabular-nums text-zinc-600">
                          ×{w.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Separator className="my-3" />

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wide text-zinc-500">
                      UPS-spårning
                    </Label>
                    {shipment ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <code className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-900">
                          {shipment.tracking_number}
                        </code>
                        <span className="text-zinc-500">
                          {shipment.boxes} låda
                          {shipment.boxes === 1 ? "" : "or"} ·{" "}
                          {shipment.carrier.toUpperCase()}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => deleteShipment(shipment.id)}
                          aria-label="Ta bort spårningsnummer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-[1fr_5rem_auto]">
                      <Input
                        placeholder="Spårningsnummer"
                        value={draft.tracking}
                        disabled={busy}
                        onChange={(e) =>
                          setTrackingDrafts((prev) => ({
                            ...prev,
                            [src.sourceKey]: {
                              ...draft,
                              tracking: e.target.value,
                            },
                          }))
                        }
                      />
                      <Input
                        type="number"
                        min={1}
                        aria-label="Antal lådor"
                        value={draft.boxes}
                        disabled={busy}
                        onChange={(e) =>
                          setTrackingDrafts((prev) => ({
                            ...prev,
                            [src.sourceKey]: {
                              ...draft,
                              boxes: e.target.value,
                            },
                          }))
                        }
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          saveShipment(src.sourceKey, src.sourceLabel, src.boxes)
                        }
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        {shipment ? "Uppdatera" : "Lägg till"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
