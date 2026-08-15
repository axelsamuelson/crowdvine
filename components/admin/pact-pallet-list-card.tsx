"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeletePalletButton } from "@/components/admin/delete-pallet-button";
import { cn } from "@/lib/utils";
import type { AdminPalletOperatingSummary } from "@/lib/admin-pallet-operating-summary";

type WineSummary = {
  wine_name: string;
  vintage: string;
  total_quantity: number;
};

type Props = {
  pallet: {
    id: string;
    name: string;
    pallet_type?: string;
    status?: string | null;
    shipping_ordered_at?: string | null;
    delivery_zone?: { name?: string } | null;
    pickup_zone?: { name?: string } | null;
    shipping_region?: { name?: string } | null;
    current_pickup_producer?: { name?: string } | null;
    wine_summary: WineSummary[];
    operating_summary?: AdminPalletOperatingSummary | null;
    total_booked_bottles: number;
    min_bottles_to_complete?: number;
    bottle_capacity: number;
    is_complete: boolean;
    completion_percentage: number;
    needs_pallet_zone?: boolean;
    pickup_is_fallback?: boolean;
    shadow_contribution?: {
      freightFundedPercent: number;
      estimatedBottlesRemaining: number | null;
      hasIncompleteSnapshots: boolean;
      isEconomicallyReady: boolean;
    };
  };
  onDeleted?: () => void;
};

function readinessLabel(op: AdminPalletOperatingSummary | null | undefined, fallbackComplete: boolean) {
  if (op) {
    if (op.operationalStatus === "shipping_ordered") return "Shipping ordered";
    if (op.isReadyToShip) return "Ready to ship";
    return "Not ready";
  }
  return fallbackComplete ? "Ready to ship" : "Not ready";
}

function readinessClass(ready: boolean, shippingOrdered: boolean) {
  if (shippingOrdered) {
    return "bg-amber-500/10 text-amber-800 dark:text-amber-200";
  }
  if (ready) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";
}

function formatSek(cents: number) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function PactPalletListCard({ pallet, onDeleted }: Props) {
  const op = pallet.operating_summary ?? null;
  const filled = op?.bottlesFilled ?? pallet.total_booked_bottles;
  const minToShip = op?.minBottlesToShip ?? pallet.min_bottles_to_complete ?? 120;
  const physical = op?.physicalBottleCapacity ?? pallet.bottle_capacity;
  const shipPct = op?.shipProgressPercent ?? pallet.completion_percentage;
  const ready = op?.isReadyToShip ?? pallet.is_complete;
  const shippingOrdered =
    op?.operationalStatus === "shipping_ordered" ||
    (typeof pallet.shipping_ordered_at === "string" &&
      pallet.shipping_ordered_at.length > 0);
  const delivery = pallet.delivery_zone?.name ?? "—";
  const origin =
    pallet.shipping_region?.name ?? pallet.pickup_zone?.name ?? "—";
  const shadow = op?.economics ?? pallet.shadow_contribution;
  const freightFunded =
    op?.economics.freightFundedPercent ??
    pallet.shadow_contribution?.freightFundedPercent;
  const warnings = op?.warnings?.slice(0, 2) ?? [];

  return (
    <div className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] hover:border-gray-300 dark:hover:border-zinc-700 transition-all overflow-hidden">
      <Link
        href={`/admin/pallets/${pallet.id}`}
        className="block p-4 pb-3 hover:bg-gray-50/80 dark:hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
              {pallet.name}
            </h3>
            {pallet.pallet_type === "region_based" ? (
              <span className="text-[9px] font-medium uppercase tracking-wide bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5">
                Auto
              </span>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              readinessClass(ready, shippingOrdered),
            )}
          >
            {readinessLabel(op, ready)}
          </span>
        </div>

        <p className="text-xs text-gray-500 dark:text-zinc-400 tabular-nums mb-2">
          <span className="text-gray-700 dark:text-zinc-300">{delivery}</span>
          <span className="mx-1.5 text-gray-400 dark:text-zinc-600">→</span>
          <span className="text-gray-700 dark:text-zinc-300">{origin}</span>
        </p>

        {pallet.current_pickup_producer?.name ? (
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2">
            Ships from{" "}
            <span className="font-medium text-gray-800 dark:text-zinc-200">
              {pallet.current_pickup_producer.name}
            </span>
          </p>
        ) : null}

        <div className="space-y-1 text-xs mb-2">
          <div className="flex justify-between tabular-nums">
            <span className="text-gray-600 dark:text-zinc-400">
              {filled} / {minToShip} to ship
            </span>
            <span className="font-semibold text-gray-900 dark:text-zinc-100">
              {shipPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                ready ? "bg-emerald-500" : "bg-amber-500",
              )}
              style={{ width: `${Math.min(100, Math.max(0, shipPct))}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-500 tabular-nums">
            <span>
              {filled} / {physical} physical
            </span>
            {freightFunded != null ? (
              <span
                title="Shadow economics — does not control live readiness"
                className={
                  op?.economics.isEconomicallyReady
                    ? "text-emerald-600 dark:text-emerald-400"
                    : undefined
                }
              >
                Shadow freight {freightFunded.toFixed(0)}%
                {op?.economics.hasIncompleteSnapshots ||
                pallet.shadow_contribution?.hasIncompleteSnapshots
                  ? " · partial"
                  : ""}
              </span>
            ) : null}
          </div>
          {op?.inbound.providerName && op.inbound.totalSekCents != null ? (
            <p className="text-[11px] text-gray-500 dark:text-zinc-500">
              {op.inbound.providerName}
              {op.inbound.serviceName ? ` · ${op.inbound.serviceName}` : ""}
              {" · "}
              {formatSek(op.inbound.totalSekCents)}
            </p>
          ) : op?.economics.freightTargetSource === "legacy_cost" ? (
            <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80">
              Legacy freight estimate
            </p>
          ) : null}
        </div>

        {warnings.length > 0 ? (
          <ul className="mb-2 space-y-0.5">
            {warnings.map((w) => (
              <li
                key={w}
                className="text-[11px] text-amber-700 dark:text-amber-500"
              >
                ⚠ {w}
              </li>
            ))}
          </ul>
        ) : null}

        {pallet.wine_summary.length > 0 ? (
          <details
            className="group text-left"
            onClick={(e) => e.preventDefault()}
            onToggle={(e) => e.stopPropagation()}
          >
            <summary className="cursor-pointer text-xs text-gray-500 dark:text-zinc-400 list-none [&::-webkit-details-marker]:hidden">
              {pallet.wine_summary.length} wine types
            </summary>
            <ul className="mt-1 space-y-0.5 text-[11px] text-gray-500 dark:text-zinc-500">
              {pallet.wine_summary.slice(0, 8).map((wine, i) => (
                <li key={i}>
                  {wine.wine_name} {wine.vintage} · {wine.total_quantity} st
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </Link>

      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-zinc-800 px-4 py-3">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-gray-200 dark:border-zinc-700 text-xs"
        >
          <Link href={`/admin/pallets/${pallet.id}`}>Status</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 rounded-lg border-gray-200 dark:border-zinc-700 text-xs"
        >
          <Link href={`/admin/pallets/${pallet.id}/edit`}>Redigera</Link>
        </Button>
        <div className="ml-auto">
          <DeletePalletButton
            palletId={pallet.id}
            palletName={pallet.name}
            onDeleted={onDeleted}
          />
        </div>
      </div>
    </div>
  );
}
