"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ADMIN_OUTLINE_BUTTON_CLASS } from "@/lib/admin-form-styles";
import {
  getProducerProcessStep,
  isProducerConfirmed,
  type B2bPalletProducerStatusRow,
  type B2bPalletStatusProducerGroup,
} from "@/lib/b2b-pallet-producer-status";
import { B2bPalletProducerCopyLinkButton } from "@/components/admin/b2b-pallet-producer-copy-link-button";
import {
  AdminB2bProducerStepAction,
  AdminB2bProducerFlowActions,
} from "@/components/admin/b2b-pallet-producer-flow-actions";
import { AdminB2bProducerWinesDialog } from "@/components/admin/b2b-pallet-producer-wines-dialog";
import { B2bPalletProducerStatusEditor } from "@/components/admin/b2b-pallet-producer-status-editor";
import { cn } from "@/lib/utils";

const PROCESS_STEPS = [
  { id: "order_sent", label: "Order sent" },
  { id: "confirmed", label: "Confirmed" },
  { id: "hub", label: "Delivered to Hub" },
  { id: "invoice_received", label: "Invoice received" },
  { id: "invoice_paid", label: "Invoice paid" },
] as const;

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function stepDoneFlags(status: B2bPalletProducerStatusRow): boolean[] {
  const confirmedDone =
    status.producer_decision_status === "confirmed" ||
    status.producer_decision_status === "partial" ||
    status.producer_decision_status === "declined";
  return [
    !!status.order_sent_at,
    confirmedDone,
    !!status.delivered_to_hub_at,
    !!status.invoice_received_at,
    !!status.invoice_paid_at,
  ];
}

/** Index of the current (first incomplete) step, or last if all done. */
function currentStepIndex(status: B2bPalletProducerStatusRow): number {
  const done = stepDoneFlags(status);
  const firstOpen = done.findIndex((d) => !d);
  return firstOpen === -1 ? PROCESS_STEPS.length - 1 : firstOpen;
}

function currentStepTimestamp(
  status: B2bPalletProducerStatusRow,
  index: number,
): string | null {
  switch (index) {
    case 0:
      return status.order_sent_at;
    case 1:
      return status.producer_decided_at;
    case 2:
      return status.delivered_to_hub_at;
    case 3:
      return status.invoice_received_at;
    case 4:
      return status.invoice_paid_at;
    default:
      return null;
  }
}

function ProducerStepRail({ status }: { status: B2bPalletProducerStatusRow }) {
  const done = stepDoneFlags(status);
  const current = currentStepIndex(status);
  const allDone = done.every(Boolean);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-0">
        {PROCESS_STEPS.map((step, i) => {
          const isDone = done[i];
          const isCurrent = !allDone && i === current;
          const isUpcoming = !isDone && !isCurrent;
          return (
            <div key={step.id} className="flex min-w-0 flex-1 items-center">
              <div
                className="flex flex-col items-center gap-1"
                title={step.label}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full border",
                    isDone &&
                      "border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400",
                    isCurrent &&
                      "border-amber-500 bg-amber-500 dark:border-amber-400 dark:bg-amber-400",
                    isUpcoming &&
                      "border-zinc-400 bg-transparent dark:border-zinc-600",
                  )}
                  aria-hidden
                />
                {isCurrent ? (
                  <span className="max-w-[5.5rem] truncate text-center text-[10px] font-medium text-amber-800 dark:text-amber-200">
                    {step.label}
                  </span>
                ) : (
                  <span className="h-3" aria-hidden />
                )}
              </div>
              {i < PROCESS_STEPS.length - 1 ? (
                <div
                  className={cn(
                    "mb-3 h-px min-w-[0.5rem] flex-1",
                    done[i]
                      ? "bg-emerald-500/50 dark:bg-emerald-400/40"
                      : "bg-zinc-300 dark:bg-zinc-700",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  shipmentId: string;
  group: B2bPalletStatusProducerGroup;
  defaultInvoiceAmountCents: number | null;
};

export function AdminB2bProducerStatusCard({
  shipmentId,
  group,
  defaultInvoiceAmountCents,
}: Props) {
  const router = useRouter();
  const s = group.status;
  const processStep = getProducerProcessStep(s);
  const isDone = processStep.tone === "done";
  const isActive = processStep.tone === "active";
  const [expanded, setExpanded] = useState(!isDone);
  const [editOpen, setEditOpen] = useState(false);
  const [winesOpen, setWinesOpen] = useState(false);
  const [undoHubOpen, setUndoHubOpen] = useState(false);
  const [undoSaving, setUndoSaving] = useState(false);

  const confirmed =
    s.confirmed_quantity != null ? s.confirmed_quantity : null;
  const qtyDelta =
    confirmed != null ? confirmed - group.orderedQuantity : null;
  const orderAccepted = isProducerConfirmed(s);
  const awaitingConfirm =
    s.producer_decision_status === "pending" && group.wines.length > 0;
  const awaitingHubDelivery = orderAccepted && !s.delivered_to_hub_at;
  const awaitingInvoiceReceived =
    orderAccepted && !!s.delivered_to_hub_at && !s.invoice_received_at;
  const awaitingInvoicePaid = !!s.invoice_received_at && !s.invoice_paid_at;

  const showDetails = !isDone || expanded;
  const paidLabel = formatDate(s.invoice_paid_at);
  const currentIdx = currentStepIndex(s);
  const visibleDate = isDone
    ? paidLabel
    : formatDateTime(currentStepTimestamp(s, currentIdx));

  const clearHubDelivery = async () => {
    setUndoSaving(true);
    try {
      const res = await fetch("/api/admin/b2b-pallet-producer-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipment_id: shipmentId,
          producer_id: group.producerId,
          delivered_to_hub_at: null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Kunde inte uppdatera status");
      }
      toast.success("Hub Delivery ångrad");
      setUndoHubOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setUndoSaving(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]",
        isActive && "border-l-2 border-l-amber-500/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {isDone ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-left"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-zinc-500 transition-transform",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
                <h3 className="text-base font-semibold text-zinc-400">
                  {group.producerName}
                </h3>
              </button>
            ) : (
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                {group.producerName}
              </h3>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
            {group.orderedQuantity} flaskor
          </p>
          {isDone && !expanded ? (
            <p className="mt-1 text-xs text-zinc-500">
              Klar · betald {paidLabel ?? "—"}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              {processStep.label}
              {visibleDate ? ` · ${visibleDate}` : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <B2bPalletProducerCopyLinkButton
            shipmentId={shipmentId}
            producerId={group.producerId}
          />
          {showDetails ? (
            <AdminB2bProducerStepAction
              shipmentId={shipmentId}
              producerId={group.producerId}
              wines={group.wines}
              orderSentAt={s.order_sent_at}
              awaitingConfirm={awaitingConfirm}
              awaitingHubDelivery={awaitingHubDelivery}
              awaitingInvoiceReceived={awaitingInvoiceReceived}
              awaitingInvoicePaid={awaitingInvoicePaid}
              invoiceAmountCents={s.invoice_amount_cents}
              defaultInvoiceAmountCents={defaultInvoiceAmountCents}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "h-8 w-8")}
                aria-label="Fler åtgärder"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]"
            >
              <DropdownMenuItem
                disabled={!s.delivered_to_hub_at}
                className="text-amber-800 focus:text-amber-900 dark:text-amber-300"
                onSelect={() => {
                  if (s.delivered_to_hub_at) setUndoHubOpen(true);
                }}
              >
                Ångra Hub Delivery
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                Redigera status
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setWinesOpen(true)}>
                + Vin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showDetails ? (
        <>
          <ProducerStepRail status={s} />

          <AdminB2bProducerFlowActions
            key={`flow-${group.producerId}-${s.updated_at ?? s.id ?? "new"}`}
            shipmentId={shipmentId}
            producerId={group.producerId}
            wines={group.wines}
            orderSentAt={s.order_sent_at}
          />

          {expanded || !isDone ? (
            <div className="mt-3 grid gap-1 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500 sm:grid-cols-2">
              <p>Order sent · {formatDateTime(s.order_sent_at) ?? "—"}</p>
              <p>
                Confirmed · {formatDateTime(s.producer_decided_at) ?? "—"}
              </p>
              <p>
                Hub · {formatDateTime(s.delivered_to_hub_at) ?? "—"}
              </p>
              <p>
                Invoice received ·{" "}
                {formatDateTime(s.invoice_received_at) ?? "—"}
              </p>
              <p>
                Invoice paid · {formatDateTime(s.invoice_paid_at) ?? "—"}
              </p>
            </div>
          ) : null}

          {qtyDelta != null && qtyDelta !== 0 ? (
            <div
              className={cn(
                "mt-4 rounded-lg border px-3 py-2 text-sm",
                qtyDelta < 0
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
                  : "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-200",
              )}
            >
              Bekräftad kvantitet {confirmed} st (beställt{" "}
              {group.orderedQuantity}) · delta{" "}
              <span className="font-semibold tabular-nums">
                {qtyDelta > 0 ? `+${qtyDelta}` : qtyDelta}
              </span>
              {qtyDelta < 0 ? " — bryter pallmatematiken" : null}
            </div>
          ) : null}

          {s.blocked_reason ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Blockerad</p>
                <p className="mt-0.5">{s.blocked_reason}</p>
              </div>
            </div>
          ) : null}

          {(s.producer_note || s.admin_note) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {s.producer_note ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                    Producentanteckning
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-zinc-200">
                    {s.producer_note}
                  </p>
                </div>
              ) : null}
              {s.admin_note ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                    Adminanteckning
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800 dark:text-zinc-200">
                    {s.admin_note}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </>
      ) : null}

      <B2bPalletProducerStatusEditor
        key={`${group.producerId}-${s.updated_at ?? s.id ?? "new"}`}
        shipmentId={shipmentId}
        producerId={group.producerId}
        producerName={group.producerName}
        orderedQuantity={group.orderedQuantity}
        initial={s}
        hideTrigger
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <AdminB2bProducerWinesDialog
        shipmentId={shipmentId}
        producerId={group.producerId}
        producerName={group.producerName}
        initialWines={group.wines.map((w) => ({
          wineId: w.wineId,
          wineName: w.wineName,
          vintage: w.vintage,
          quantity: w.quantity,
        }))}
        hideTrigger
        open={winesOpen}
        onOpenChange={setWinesOpen}
      />

      <AlertDialog open={undoHubOpen} onOpenChange={setUndoHubOpen}>
        <AlertDialogContent className="border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <AlertDialogHeader>
            <AlertDialogTitle>Ångra Hub Delivery?</AlertDialogTitle>
            <AlertDialogDescription>
              Detta nollställer leveransdatum till hub för {group.producerName}.
              Åtgärden kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undoSaving}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              disabled={undoSaving}
              onClick={(e) => {
                e.preventDefault();
                void clearHubDelivery();
              }}
            >
              {undoSaving ? "Sparar…" : "Ångra Hub Delivery"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
