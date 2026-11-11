"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Trash2, Plus, MapPin, Calendar, Mail } from "lucide-react";
import { EMAIL_MISSING_LABEL } from "@/lib/admin/direct-box-pickup-addresses";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ADMIN_FORM_FIELDS_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import {
  allowedDispatchTransitions,
  DISPATCH_STATUS_ACTION_LABELS_SV,
  DISPATCH_STATUS_BADGE_CLASS,
  DISPATCH_STATUS_LABELS_SV,
  normalizeDispatchStatus,
  type DirectBoxDispatchStatus,
} from "@/lib/commerce/direct-box-dispatch";
import {
  buildDirectBoxPickList,
  type PickListItemInput,
} from "@/lib/admin/direct-box-pick-list";

const ICON_CLASS = "h-4 w-4 shrink-0 text-gray-500 dark:text-zinc-400";

const ADMIN_PRIMARY_BTN =
  "rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200";

const DASHBOARD_CARD =
  "rounded-xl border border-gray-200 bg-white p-6 dark:border-[#1F1F23] dark:bg-[#0F0F12]";

const DIALOG_SURFACE =
  "rounded-xl border-gray-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

export const CANCEL_DISPATCH_DIALOG = {
  question: "Är du säker på att du vill avbryta den här direktleveransen?",
  consequence:
    "Ordern markeras som avbruten. Spårning och plocklista behålls, men leveransen går inte vidare.",
  keep: "Behåll",
  confirm: "Avbryt leveransen",
} as const;

export const DELETE_SHIPMENT_DIALOG = {
  question: "Ta bort spårningsnummer?",
  consequence: "Spårningsnumret tas bort från den här källan. Du kan lägga till det igen senare.",
  keep: "Behåll",
  confirm: "Ta bort",
} as const;

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    toDatetimeLocalValue(deliveredAt),
  );
  const [trackingDrafts, setTrackingDrafts] = useState<
    Record<string, { tracking: string; boxes: string }>
  >({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteShipmentId, setDeleteShipmentId] = useState<string | null>(null);

  const current = normalizeDispatchStatus(fulfillmentDispatchStatus);
  const nextStatuses = allowedDispatchTransitions(current);
  const primaryStatuses = nextStatuses.filter((s) => s !== "cancelled");
  const canCancel = nextStatuses.includes("cancelled");

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
        toast.error("Kunde inte uppdatera status");
        return;
      }
      toast.success(`Status: ${DISPATCH_STATUS_LABELS_SV[status]}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
      toast.error("Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setCancelDialogOpen(false);
    await transitionTo("cancelled");
  }

  async function saveDeliveredAt() {
    setBusy(true);
    setError(null);
    try {
      const value = deliveredDraft.trim()
        ? new Date(deliveredDraft).toISOString()
        : null;
      if (deliveredDraft.trim() && Number.isNaN(new Date(deliveredDraft).getTime())) {
        setError("Ogiltigt datum");
        setBusy(false);
        return;
      }
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
        setError(json.error || "Kunde inte spara leveransdatum");
        toast.error("Kunde inte spara leveransdatum");
        return;
      }
      toast.success("Leveransdatum sparat");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
      toast.error("Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function saveShipment(
    sourceKey: string,
    sourceLabel: string,
    boxes: number,
  ) {
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
        toast.error("Kunde inte spara spårningsnummer");
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
      toast.success("Spårningsnummer sparat");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
      toast.error("Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeleteShipment() {
    const shipmentId = deleteShipmentId;
    setDeleteShipmentId(null);
    if (!shipmentId) return;
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
        toast.error("Kunde inte ta bort spårningsnummer");
        return;
      }
      setShipments((prev) => prev.filter((s) => s.id !== shipmentId));
      toast.success("Spårningsnummer borttaget");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nätverksfel");
      toast.error("Nätverksfel");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn("space-y-4", ADMIN_FORM_FIELDS_CLASS)}
      lang="sv-SE"
      data-testid="direct-box-fulfillment-panel"
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className={DASHBOARD_CARD}>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Truck className={ICON_CLASS} aria-hidden />
            Direktleverans (UPS)
          </h2>
          <p className={cn("mt-1", ADMIN_HELP_TEXT_CLASS)}>
            Status, spårning och plocklista
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Status:
            </span>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                DISPATCH_STATUS_BADGE_CLASS[current],
              )}
              data-testid="dispatch-status"
            >
              {DISPATCH_STATUS_LABELS_SV[current]}
            </span>
            {statusUpdatedAt ? (
              <span className="text-xs text-gray-500 dark:text-zinc-400">
                uppdaterad{" "}
                {new Date(statusUpdatedAt).toLocaleString("sv-SE", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
          </div>

          {nextStatuses.length > 0 ? (
            <div className="flex flex-col gap-3">
              {primaryStatuses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {primaryStatuses.map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={cn(
                        s === "skipped"
                          ? ADMIN_OUTLINE_BUTTON_CLASS
                          : ADMIN_PRIMARY_BTN,
                        "text-xs font-medium",
                      )}
                      disabled={busy}
                      onClick={() => transitionTo(s)}
                      data-testid={`dispatch-to-${s}`}
                    >
                      {DISPATCH_STATUS_ACTION_LABELS_SV[s] ??
                        DISPATCH_STATUS_LABELS_SV[s]}
                    </Button>
                  ))}
                </div>
              ) : null}
              {canCancel ? (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn(
                      "rounded-lg border-red-200 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40",
                    )}
                    disabled={busy}
                    onClick={() => setCancelDialogOpen(true)}
                    data-testid="dispatch-to-cancelled"
                  >
                    Avbryt leveransen…
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inga ytterligare övergångar.
            </p>
          )}

          <Separator className="bg-gray-200 dark:bg-zinc-800" />

          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="delivered_at" className={ADMIN_LABEL_CLASS}>
                Levererad
              </Label>
              <Input
                id="delivered_at"
                type="datetime-local"
                lang="sv-SE"
                value={deliveredDraft}
                onChange={(e) => setDeliveredDraft(e.target.value)}
                disabled={busy}
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
              disabled={busy}
              onClick={saveDeliveredAt}
            >
              Spara datum
            </Button>
          </div>
        </div>
      </section>

      <section className={DASHBOARD_CARD}>
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Package className={ICON_CLASS} aria-hidden />
            Plocklista
          </h2>
          <div
            className={cn(
              "mt-2 flex flex-wrap gap-x-4 gap-y-1",
              ADMIN_HELP_TEXT_CLASS,
            )}
          >
            <span className="inline-flex items-center gap-1">
              <Calendar className={ICON_CLASS} aria-hidden />
              Order: {pickList.orderDateIso}
            </span>
            <span>
              Sista inlämningsdag på Access Point:{" "}
              <strong className="text-gray-900 dark:text-zinc-100">
                {pickList.targetDropoffIso}
              </strong>{" "}
              (+3 arbetsdagar)
              {" · "}
              hård gräns{" "}
              <strong className="text-gray-900 dark:text-zinc-100">
                {pickList.latestDropoffIso}
              </strong>{" "}
              (+5 arbetsdagar)
            </span>
            <span>
              Totalt {pickList.totalBoxes} lådor / {pickList.totalBottles}{" "}
              flaskor
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {pickList.sources.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Inga rader på ordern.
            </p>
          ) : (
            pickList.sources.map((src) => {
              const shipment = shipments.find(
                (s) => s.source_key === src.sourceKey,
              );
              const draft = trackingDrafts[src.sourceKey] ?? {
                tracking: shipment?.tracking_number ?? "",
                boxes: String(shipment?.boxes ?? src.boxes),
              };
              const trackingFieldId = `tracking-${src.sourceKey}`;
              const boxesFieldId = `boxes-${src.sourceKey}`;
              return (
                <div
                  key={src.sourceKey}
                  className="rounded-lg border border-gray-200 p-4 dark:border-zinc-800"
                  data-testid={`pick-source-${src.sourceKey}`}
                >
                  <div className="mb-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="min-w-0 flex-1 text-sm font-semibold text-gray-900 dark:text-zinc-100">
                        {src.sourceLabel}
                      </h3>
                      <span className="inline-flex shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {src.kind === "wholesaler" ? "Grossist" : "Producent"}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {src.boxes} låda{src.boxes === 1 ? "" : "or"} (
                      {src.bottles} flaskor)
                    </p>
                    {src.addressMissing ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800/50 dark:bg-amber-900/20">
                        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                          Adress saknas
                        </p>
                        {src.kind === "producer" && src.producerId ? (
                          <Link
                            href={`/admin/producers/${src.producerId}`}
                            className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:opacity-80 dark:text-amber-300/90"
                          >
                            Lägg till adress
                          </Link>
                        ) : (
                          <p className="text-xs text-amber-800 dark:text-amber-300/90">
                            Ingen avsändaradress för den här källan.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 flex items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <MapPin className={`${ICON_CLASS} mt-0.5`} aria-hidden />
                        <span>
                          <span className="sr-only">Avsändaradress: </span>
                          {src.senderAddress}
                        </span>
                      </p>
                    )}
                    {src.emailMissing ? (
                      <div className="mt-2 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800/50 dark:bg-amber-900/20">
                        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-200">
                          <Mail className="h-4 w-4 shrink-0" aria-hidden />
                          {EMAIL_MISSING_LABEL}
                        </p>
                        {src.kind === "producer" && src.producerId ? (
                          <Link
                            href={`/admin/producers/${src.producerId}`}
                            className="text-xs font-medium text-amber-800 underline underline-offset-2 hover:opacity-80 dark:text-amber-300/90"
                          >
                            Lägg till e-post
                          </Link>
                        ) : null}
                      </div>
                    ) : src.contactEmail ? (
                      <p className="mt-1 flex items-start gap-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <Mail className={`${ICON_CLASS} mt-0.5`} aria-hidden />
                        <a
                          href={`mailto:${src.contactEmail}`}
                          className="underline-offset-2 hover:underline"
                        >
                          {src.contactEmail}
                        </a>
                      </p>
                    ) : null}
                  </div>

                  <ul className="mb-3 space-y-1 text-sm text-gray-900 dark:text-zinc-100">
                    {src.wines.map((w) => (
                      <li
                        key={w.wineId || w.wineName}
                        className="flex justify-between gap-2"
                      >
                        <span>
                          {w.wineName}
                          {w.vintage ? ` (${w.vintage})` : ""}
                        </span>
                        <span className="tabular-nums text-zinc-600 dark:text-zinc-400">
                          ×{w.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Separator className="my-3 bg-gray-200 dark:bg-zinc-800" />

                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      UPS-spårning
                    </p>
                    {shipment ? (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-900 dark:bg-zinc-800 dark:text-zinc-100">
                          {shipment.tracking_number}
                        </code>
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {shipment.boxes} kolli
                          {shipment.boxes === 1 ? "" : "n"} ·{" "}
                          {shipment.carrier.toUpperCase()}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setDeleteShipmentId(shipment.id)}
                          aria-label="Ta bort spårningsnummer"
                        >
                          <Trash2 className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
                      <div className="space-y-1">
                        <Label
                          htmlFor={trackingFieldId}
                          className={cn("text-xs", ADMIN_LABEL_CLASS)}
                        >
                          Spårningsnummer
                        </Label>
                        <Input
                          id={trackingFieldId}
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
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={boxesFieldId}
                          className={cn("text-xs", ADMIN_LABEL_CLASS)}
                        >
                          Antal kollin
                        </Label>
                        <Input
                          id={boxesFieldId}
                          type="number"
                          min={1}
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
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(ADMIN_PRIMARY_BTN, "text-xs font-medium")}
                        disabled={busy}
                        onClick={() =>
                          saveShipment(
                            src.sourceKey,
                            src.sourceLabel,
                            src.boxes,
                          )
                        }
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        {shipment ? "Uppdatera" : "Lägg till"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent
          className={DIALOG_SURFACE}
          data-testid="cancel-dispatch-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">
              {CANCEL_DISPATCH_DIALOG.question}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-600 dark:text-zinc-400">
              {CANCEL_DISPATCH_DIALOG.consequence}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "mt-0 text-xs font-medium")}
            >
              {CANCEL_DISPATCH_DIALOG.keep}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
              data-testid="confirm-cancel-dispatch"
            >
              {CANCEL_DISPATCH_DIALOG.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteShipmentId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteShipmentId(null);
        }}
      >
        <AlertDialogContent className={DIALOG_SURFACE}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">
              {DELETE_SHIPMENT_DIALOG.question}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-600 dark:text-zinc-400">
              {DELETE_SHIPMENT_DIALOG.consequence}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "mt-0 text-xs font-medium")}
            >
              {DELETE_SHIPMENT_DIALOG.keep}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 text-xs font-medium text-white hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteShipment();
              }}
            >
              {DELETE_SHIPMENT_DIALOG.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
