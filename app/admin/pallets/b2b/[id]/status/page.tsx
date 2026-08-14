import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import { formatSekFromCents } from "@/lib/b2b-wine-cost";
import {
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import {
  emptyProducerStatus,
  getProducerProcessStep,
  isProducerConfirmed,
  summarizeB2bPalletProgress,
  type B2bPalletProducerStatusRow,
  type B2bPalletStatusProducerGroup,
} from "@/lib/b2b-pallet-producer-status";
import { formatProducerAddress } from "@/lib/b2b-pallet-pickup";
import { B2bPalletProducerStatusEditor } from "@/components/admin/b2b-pallet-producer-status-editor";
import {
  AdminB2bProducerStepAction,
  AdminB2bProducerFlowActions,
} from "@/components/admin/b2b-pallet-producer-flow-actions";
import { AdminB2bPalletStatusSummary } from "@/components/admin/b2b-pallet-status-summary";
import { AdminB2bProducerWinesDialog } from "@/components/admin/b2b-pallet-producer-wines-dialog";
import { B2bPalletProducerCopyLinkButton } from "@/components/admin/b2b-pallet-producer-copy-link-button";
import { cn } from "@/lib/utils";

type ItemRow = {
  id: string;
  wine_id: string;
  quantity: number;
  created_at?: string | null;
  wines?: {
    id: string;
    wine_name?: string | null;
    vintage?: string | null;
    producers?: {
      id: string;
      name?: string | null;
    } | null;
  } | null;
};

type ShipmentRow = {
  id: string;
  name: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cost_cents: number | null;
  pickup_producer_id: string | null;
  pickup_producer?: {
    id: string;
    name: string | null;
    address_street?: string | null;
    address_city?: string | null;
    address_postcode?: string | null;
    region?: string | null;
    subregion?: string | null;
  } | null;
  b2b_pallet_shipment_items?: ItemRow[] | null;
};

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

function StageChip({
  label,
  done,
  awaiting,
  dateLabel,
}: {
  label: string;
  done: boolean;
  /** Next action (orange). */
  awaiting?: boolean;
  dateLabel?: string | null;
}) {
  return (
    <div
      className={cn(
        "min-w-[7.5rem] flex-1 rounded-lg border px-2.5 py-2",
        done
          ? "border-emerald-500/30 bg-emerald-500/10"
          : awaiting
            ? "border-amber-500/40 bg-amber-500/10"
            : "border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/50",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-medium",
          done
            ? "text-emerald-700 dark:text-emerald-300"
            : awaiting
              ? "text-amber-800 dark:text-amber-200"
              : "text-gray-500 dark:text-zinc-500",
        )}
      >
        {label}
      </p>
      {!(awaiting && !dateLabel) ? (
        <p
          className={cn(
            "mt-0.5 text-xs tabular-nums",
            done
              ? "text-gray-900 dark:text-zinc-100"
              : awaiting
                ? "text-amber-800 dark:text-amber-200"
                : "text-gray-400 dark:text-zinc-600",
          )}
        >
          {done
            ? dateLabel || "Klart"
            : awaiting
              ? dateLabel || "Väntar"
              : "—"}
        </p>
      ) : null}
    </div>
  );
}

function earliestIso(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function groupProducers(
  shipmentId: string,
  items: ItemRow[],
  statusByProducer: Map<string, B2bPalletProducerStatusRow>,
  wineStatusByWineId: Map<
    string,
    {
      decisionStatus: B2bPalletStatusProducerGroup["wines"][number]["decisionStatus"];
      confirmedQuantity: number | null;
      rejectReason: string | null;
      decidedAt: string | null;
    }
  >,
): B2bPalletStatusProducerGroup[] {
  const map = new Map<
    string,
    {
      producerId: string;
      producerName: string;
      orderedQuantity: number;
      /** When this producer's wine(s) were first added to the pallet. */
      winesAddedAt: string | null;
      wines: Map<string, B2bPalletStatusProducerGroup["wines"][number]>;
    }
  >();

  for (const item of items) {
    const producer = item.wines?.producers;
    if (!producer?.id) continue;
    const existing = map.get(producer.id);
    const wineId = item.wines?.id ?? item.wine_id;
    const wineName = item.wines?.wine_name?.trim() || "Okänt vin";
    const vintage = item.wines?.vintage ?? null;
    const qty = Number(item.quantity) || 0;
    const itemCreatedAt = item.created_at ?? null;
    const wineDecision = wineStatusByWineId.get(wineId);

    if (!existing) {
      const wines = new Map();
      wines.set(wineId, {
        wineId,
        wineName,
        vintage,
        quantity: qty,
        decisionStatus: wineDecision?.decisionStatus ?? "pending",
        confirmedQuantity: wineDecision?.confirmedQuantity ?? null,
        rejectReason: wineDecision?.rejectReason ?? null,
        decidedAt: wineDecision?.decidedAt ?? null,
      });
      map.set(producer.id, {
        producerId: producer.id,
        producerName: producer.name?.trim() || "Okänd producent",
        orderedQuantity: qty,
        winesAddedAt: itemCreatedAt,
        wines,
      });
    } else {
      existing.orderedQuantity += qty;
      existing.winesAddedAt = earliestIso(existing.winesAddedAt, itemCreatedAt);
      const wine = existing.wines.get(wineId);
      if (wine) wine.quantity += qty;
      else {
        existing.wines.set(wineId, {
          wineId,
          wineName,
          vintage,
          quantity: qty,
          decisionStatus: wineDecision?.decisionStatus ?? "pending",
          confirmedQuantity: wineDecision?.confirmedQuantity ?? null,
          rejectReason: wineDecision?.rejectReason ?? null,
          decidedAt: wineDecision?.decidedAt ?? null,
        });
      }
    }
  }

  return Array.from(map.values())
    .map((g) => {
      const stored =
        statusByProducer.get(g.producerId) ??
        emptyProducerStatus(shipmentId, g.producerId);
      // Same fallback as producer Orders list: explicit send date, else when wines were added
      return {
        producerId: g.producerId,
        producerName: g.producerName,
        orderedQuantity: g.orderedQuantity,
        wines: Array.from(g.wines.values()).sort((a, b) =>
          a.wineName.localeCompare(b.wineName, "sv"),
        ),
        status: {
          ...stored,
          order_sent_at: stored.order_sent_at ?? g.winesAddedAt,
        },
      };
    })
    .sort((a, b) => a.producerName.localeCompare(b.producerName, "sv"));
}

export default async function B2BPalletStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data: shipment, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !shipment) {
    notFound();
  }

  const row = shipment as unknown as ShipmentRow;

  const { data: statusRows } = await sb
    .from("b2b_pallet_producer_status")
    .select("*")
    .eq("shipment_id", id);

  const statusByProducer = new Map<string, B2bPalletProducerStatusRow>();
  for (const s of (statusRows ?? []) as B2bPalletProducerStatusRow[]) {
    statusByProducer.set(s.producer_id, {
      ...emptyProducerStatus(id, s.producer_id),
      ...s,
      producer_decision_status: s.producer_decision_status || "pending",
    });
  }

  const { data: wineStatusRows, error: wineStatusError } = await sb
    .from("b2b_pallet_producer_wine_status")
    .select(
      "wine_id, decision_status, confirmed_quantity, reject_reason, decided_at",
    )
    .eq("shipment_id", id);

  const wineStatusByWineId = new Map<
    string,
    {
      decisionStatus: B2bPalletStatusProducerGroup["wines"][number]["decisionStatus"];
      confirmedQuantity: number | null;
      rejectReason: string | null;
      decidedAt: string | null;
    }
  >();
  if (!wineStatusError) {
    for (const ws of wineStatusRows ?? []) {
      wineStatusByWineId.set(ws.wine_id as string, {
        decisionStatus:
          (ws.decision_status as
            | "pending"
            | "confirmed"
            | "declined") || "pending",
        confirmedQuantity:
          ws.confirmed_quantity != null ? Number(ws.confirmed_quantity) : null,
        rejectReason:
          typeof ws.reject_reason === "string" ? ws.reject_reason : null,
        decidedAt: typeof ws.decided_at === "string" ? ws.decided_at : null,
      });
    }
  }

  const items = row.b2b_pallet_shipment_items ?? [];
  const producers = groupProducers(
    id,
    items,
    statusByProducer,
    wineStatusByWineId,
  );
  const totalBottles = producers.reduce((sum, p) => sum + p.orderedQuantity, 0);
  const confirmedCount = producers.filter((p) => isProducerConfirmed(p.status)).length;
  const palletProgress = summarizeB2bPalletProgress(
    producers.map((p) => p.producerId),
    new Map(producers.map((p) => [p.producerId, p.status])),
    { shippedAt: row.shipped_at },
  );
  const palletProducers = producers.map((p) => {
    const step = getProducerProcessStep(p.status);
    return {
      producerId: p.producerId,
      producerName: p.producerName,
      bottleCount: p.orderedQuantity,
      stepLabel: step.label,
      stepTone: step.tone,
    };
  });
  const hubName =
    row.pickup_producer?.name?.trim() ||
    (row.pickup_producer_id ? "Okänd hub" : "Automatisk (20%-regeln)");
  const hubAddress = row.pickup_producer
    ? formatProducerAddress(row.pickup_producer)
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="mt-0.5 text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <Link href="/admin/pallets?tab=b2b">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {row.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {totalBottles} flaskor · {confirmedCount}/{producers.length} producenter
              bekräftade
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium h-8")}
        >
          <Link href={`/admin/pallets/b2b/${id}/edit`}>Redigera pall</Link>
        </Button>
      </header>

      <AdminB2bPalletStatusSummary
        shippedLabel={formatDate(row.shipped_at)}
        deliveredLabel={formatDate(row.delivered_at)}
        hubName={hubName}
        hubAddress={hubAddress}
        costLabel={
          row.cost_cents != null ? formatSekFromCents(row.cost_cents) : null
        }
        progress={palletProgress}
        producers={palletProducers}
      />

      <div className="space-y-4">
        {producers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-[#1F1F23] dark:text-zinc-400">
            Inga viner på pallen — lägg till artiklar under Redigera.
          </div>
        ) : (
          producers.map((group) => {
            const s = group.status;
            const confirmed =
              s.confirmed_quantity != null ? s.confirmed_quantity : null;
            const qtyDelta =
              confirmed != null ? confirmed - group.orderedQuantity : null;
            const confirmedDone =
              s.producer_decision_status === "confirmed" ||
              s.producer_decision_status === "partial" ||
              s.producer_decision_status === "declined";
            const orderAccepted = isProducerConfirmed(s);
            const awaitingConfirm =
              s.producer_decision_status === "pending" &&
              group.wines.length > 0;
            const awaitingHubDelivery = orderAccepted && !s.delivered_to_hub_at;
            const processStep = getProducerProcessStep(s);

            return (
              <section
                key={group.producerId}
                className="rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {group.producerName}
                    </h3>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                      {group.orderedQuantity} flaskor
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
                      Status: {processStep.label}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <B2bPalletProducerCopyLinkButton
                      shipmentId={id}
                      producerId={group.producerId}
                    />
                    <AdminB2bProducerStepAction
                      shipmentId={id}
                      producerId={group.producerId}
                      wines={group.wines}
                      orderSentAt={s.order_sent_at}
                      awaitingConfirm={awaitingConfirm}
                      awaitingHubDelivery={awaitingHubDelivery}
                    />
                    <AdminB2bProducerWinesDialog
                      shipmentId={id}
                      producerId={group.producerId}
                      producerName={group.producerName}
                      initialWines={group.wines.map((w) => ({
                        wineId: w.wineId,
                        wineName: w.wineName,
                        vintage: w.vintage,
                        quantity: w.quantity,
                      }))}
                    />
                    <B2bPalletProducerStatusEditor
                      key={`${group.producerId}-${s.updated_at ?? s.id ?? "new"}`}
                      shipmentId={id}
                      producerId={group.producerId}
                      producerName={group.producerName}
                      orderedQuantity={group.orderedQuantity}
                      initial={s}
                    />
                  </div>
                </div>

                <AdminB2bProducerFlowActions
                  key={`flow-${group.producerId}-${s.updated_at ?? s.id ?? "new"}`}
                  shipmentId={id}
                  producerId={group.producerId}
                  wines={group.wines}
                  orderSentAt={s.order_sent_at}
                  deliveredToHubAt={s.delivered_to_hub_at}
                />

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
                    {qtyDelta < 0
                      ? " — bryter pallmatematiken"
                      : null}
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

                <div className="mt-4 flex flex-wrap gap-2">
                  <StageChip
                    label="Order sent"
                    done={!!s.order_sent_at}
                    dateLabel={formatDateTime(s.order_sent_at)}
                  />
                  <StageChip
                    label={
                      awaitingConfirm ? "Awaiting confirmation" : "Confirmed"
                    }
                    done={confirmedDone && s.producer_decision_status !== "declined"}
                    awaiting={awaitingConfirm}
                    dateLabel={
                      s.producer_decision_status === "declined"
                        ? `Avböjd${formatDateTime(s.producer_decided_at) ? ` · ${formatDateTime(s.producer_decided_at)}` : ""}`
                        : awaitingConfirm
                          ? null
                          : formatDateTime(s.producer_decided_at)
                    }
                  />
                  <StageChip
                    label={
                      awaitingHubDelivery
                        ? "Awaiting Hub Delivery"
                        : s.delivered_to_hub_at
                          ? "Delivered to Hub"
                          : "Hub Delivery"
                    }
                    done={!!s.delivered_to_hub_at}
                    awaiting={awaitingHubDelivery}
                    dateLabel={
                      s.delivered_to_hub_at
                        ? formatDateTime(s.delivered_to_hub_at)
                        : null
                    }
                  />
                  <StageChip
                    label="Invoice received"
                    done={!!s.invoice_received_at}
                    dateLabel={formatDateTime(s.invoice_received_at)}
                  />
                  <StageChip
                    label="Invoice paid"
                    done={!!s.invoice_paid_at}
                    dateLabel={formatDateTime(s.invoice_paid_at)}
                  />
                </div>

                {(s.producer_note || s.admin_note) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {s.producer_note ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                          Producentanteckning
                        </p>
                        <p className="mt-1 text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">
                          {s.producer_note}
                        </p>
                      </div>
                    ) : null}
                    {s.admin_note ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                          Adminanteckning
                        </p>
                        <p className="mt-1 text-sm text-gray-800 dark:text-zinc-200 whitespace-pre-wrap">
                          {s.admin_note}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
