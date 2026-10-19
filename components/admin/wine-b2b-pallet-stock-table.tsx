"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PalletStockRow {
  id: string;
  pallet_name: string;
  pallet_id: string;
  is_active: boolean;
  inbound: number;
  sold: number;
  remaining: number;
  sellable_remaining: number;
  shipping_per_bottle_cents: number;
  shipping_per_bottle_sek: number;
}

interface PalletStockData {
  rows: PalletStockRow[];
  total_inbound: number;
  total_sold: number;
  total_remaining: number;
}

interface WineB2BPalletStockTableProps {
  wineId: string;
  onStockUpdated?: () => void;
  embedded?: boolean;
}

function PalletStockFrame({
  embedded,
  title,
  description,
  children,
}: {
  embedded?: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  if (embedded) {
    return (
      <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-zinc-800">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    );
  }

  return (
    <Card className="dark:border-zinc-800 dark:bg-[#0F0F12]">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function commitNumber(
  raw: string,
  current: number,
  onCommit: (value: number) => void,
) {
  const v = parseInt(raw, 10);
  if (!Number.isNaN(v) && v >= 0 && v !== current) {
    onCommit(v);
  }
}

export function WineB2BPalletStockTable({
  wineId,
  onStockUpdated,
  embedded = false,
}: WineB2BPalletStockTableProps) {
  const [data, setData] = useState<PalletStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<
    Record<string, { inbound: string; sold: string }>
  >({});

  const fetchStock = async () => {
    try {
      const res = await fetch(`/api/admin/wines/${wineId}/pallet-stock`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error("Kunde inte hämta pallager");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, [wineId]);

  useEffect(() => {
    if (data) {
      const next: Record<string, { inbound: string; sold: string }> = {};
      data.rows.forEach((row) => {
        next[row.id] = { inbound: String(row.inbound), sold: String(row.sold) };
      });
      setEditValues(next);
    }
  }, [data]);

  const updateItem = async (
    itemId: string,
    field: "quantity" | "quantity_sold",
    value: number,
  ) => {
    setUpdatingId(itemId);
    try {
      const res = await fetch(
        `/api/admin/b2b-pallet-shipment-items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Kunde inte uppdatera");
      }
      await fetchStock();
      onStockUpdated?.();
      toast.success("Uppdaterat");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte uppdatera");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <PalletStockFrame
        embedded={embedded}
        title="B2B-lager (från pallar)"
        description="Lager hämtas från Dirty Wine-pallar"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-zinc-500" />
        </div>
      </PalletStockFrame>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <PalletStockFrame
        embedded={embedded}
        title="B2B-lager (från pallar)"
        description="Lägg till vinet på en pall under Admin → Pallets → Dirty Wine."
      >
        <div className="flex items-center gap-2 py-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
          <p className="text-sm text-zinc-400">
            Inte i lager — lägg till pall under Admin → Pallets
          </p>
        </div>
      </PalletStockFrame>
    );
  }

  return (
    <PalletStockFrame
      embedded={embedded}
      title="B2B-lager (från pallar)"
      description="Inbound = mottaget. Sålt = hur många som sålts (drar ner lager)."
    >
      <div className="space-y-3">
        {data.rows.map((row) => {
          const inboundValue = editValues[row.id]?.inbound ?? String(row.inbound);
          const soldValue = editValues[row.id]?.sold ?? String(row.sold);
          const busy = updatingId === row.id;

          return (
            <div
              key={row.id}
              className={cn(
                "space-y-3 rounded-lg border border-gray-200 p-3 dark:border-zinc-800",
                !row.is_active && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {row.pallet_name}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                    Kvar {row.remaining}
                    {(row.shipping_per_bottle_sek ?? 0) > 0
                      ? ` · ${(row.shipping_per_bottle_sek ?? 0).toFixed(2)} kr/fl`
                      : ""}
                  </p>
                </div>
                <span
                  className={
                    row.is_active
                      ? "inline-flex shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
                      : "inline-flex shrink-0 rounded-full bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400"
                  }
                >
                  {row.is_active ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label
                    htmlFor={`b2b-inbound-${row.id}`}
                    className="text-xs text-gray-500 dark:text-zinc-400"
                  >
                    Inbound
                  </Label>
                  <Input
                    id={`b2b-inbound-${row.id}`}
                    type="number"
                    min={0}
                    value={inboundValue}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [row.id]: {
                          inbound: e.target.value,
                          sold: prev[row.id]?.sold ?? String(row.sold),
                        },
                      }))
                    }
                    onBlur={(e) =>
                      commitNumber(e.target.value, row.inbound, (v) =>
                        updateItem(row.id, "quantity", v),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitNumber(
                          (e.target as HTMLInputElement).value,
                          row.inbound,
                          (v) => updateItem(row.id, "quantity", v),
                        );
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    disabled={busy}
                    className="h-8 text-right"
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor={`b2b-sold-${row.id}`}
                    className="text-xs text-gray-500 dark:text-zinc-400"
                  >
                    Sålt
                  </Label>
                  <Input
                    id={`b2b-sold-${row.id}`}
                    type="number"
                    min={0}
                    value={soldValue}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [row.id]: {
                          inbound:
                            prev[row.id]?.inbound ?? String(row.inbound),
                          sold: e.target.value,
                        },
                      }))
                    }
                    onBlur={(e) =>
                      commitNumber(e.target.value, row.sold, (v) =>
                        updateItem(row.id, "quantity_sold", v),
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        commitNumber(
                          (e.target as HTMLInputElement).value,
                          row.sold,
                          (v) => updateItem(row.id, "quantity_sold", v),
                        );
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    disabled={busy}
                    className="h-8 text-right"
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-600 dark:border-zinc-800 dark:text-zinc-400">
          <div className="flex justify-between gap-2">
            <span>Totalt inbound</span>
            <span className="tabular-nums">{data.total_inbound}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>Sålt</span>
            <span className="tabular-nums">{data.total_sold}</span>
          </div>
          <div className="flex justify-between gap-2 font-medium text-gray-900 dark:text-white">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
              Tillgängligt
            </span>
            <span className="tabular-nums">{data.total_remaining}</span>
          </div>
        </div>
      </div>
    </PalletStockFrame>
  );
}
