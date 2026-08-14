"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";

type WineLine = {
  wineId: string;
  wineName: string;
  vintage: string | null;
  quantity: number;
};

type AvailableWine = {
  id: string;
  wine_name: string | null;
  vintage: string | null;
  producers?: { id?: string; name?: string | null } | null;
};

type Props = {
  shipmentId: string;
  producerId: string;
  producerName: string;
  initialWines: WineLine[];
};

function wineLabel(w: { wineName?: string; wine_name?: string | null; vintage: string | null }) {
  const name = (w.wineName ?? w.wine_name ?? "Vin").trim();
  return w.vintage ? `${name} ${w.vintage}` : name;
}

export function AdminB2bProducerWinesDialog({
  shipmentId,
  producerId,
  producerName,
  initialWines,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingWines, setLoadingWines] = useState(false);
  const [lines, setLines] = useState<WineLine[]>(initialWines);
  const [available, setAvailable] = useState<AvailableWine[]>([]);
  const [addWineId, setAddWineId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setLines(
      initialWines.map((w) => ({
        ...w,
        quantity: Math.max(1, w.quantity),
      })),
    );
    setAddWineId("");
  }, [open, initialWines]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingWines(true);
    void (async () => {
      try {
        const res = await fetch("/api/admin/wines/with-cost");
        const json = await res.json().catch(() => []);
        if (!res.ok) throw new Error("Kunde inte ladda viner");
        const list = (Array.isArray(json) ? json : json?.wines ?? []) as AvailableWine[];
        const forProducer = list.filter((w) => {
          const p = Array.isArray(w.producers) ? w.producers[0] : w.producers;
          return p?.id === producerId;
        });
        if (!cancelled) setAvailable(forProducer);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            err instanceof Error ? err.message : "Kunde inte ladda viner",
          );
        }
      } finally {
        if (!cancelled) setLoadingWines(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, producerId]);

  const onPalletIds = useMemo(
    () => new Set(lines.map((l) => l.wineId)),
    [lines],
  );

  const addableWines = useMemo(
    () =>
      available
        .filter((w) => !onPalletIds.has(w.id))
        .sort((a, b) =>
          wineLabel(a).localeCompare(wineLabel(b), "sv"),
        ),
    [available, onPalletIds],
  );

  const setQty = (wineId: string, raw: string) => {
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    setLines((prev) =>
      prev.map((l) => (l.wineId === wineId ? { ...l, quantity: n } : l)),
    );
  };

  const removeLine = (wineId: string) => {
    setLines((prev) => prev.filter((l) => l.wineId !== wineId));
  };

  const addWine = () => {
    if (!addWineId) return;
    const w = available.find((x) => x.id === addWineId);
    if (!w) return;
    setLines((prev) => [
      ...prev,
      {
        wineId: w.id,
        wineName: w.wine_name?.trim() || "Vin",
        vintage: w.vintage,
        quantity: 1,
      },
    ]);
    setAddWineId("");
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/b2b-pallet-shipments/${shipmentId}/producer-wines`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producer_id: producerId,
            items: lines.map((l) => ({
              wine_id: l.wineId,
              quantity: l.quantity,
            })),
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Kunde inte spara");
      }
      toast.success(`Viner uppdaterade · ${producerName}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "h-8 text-xs font-medium")}
        onClick={() => setOpen(true)}
      >
        + Vin
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">
              Viner · {producerName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-[#1F1F23]">
              <table className="w-full min-w-[20rem] text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 dark:border-[#1F1F23] dark:bg-zinc-900/50 dark:text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Vin</th>
                    <th className="px-3 py-2 font-medium tabular-nums w-24">
                      Antal
                    </th>
                    <th className="w-10 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-sm text-gray-500 dark:text-zinc-400"
                      >
                        Inga viner för denna producent på pallen.
                      </td>
                    </tr>
                  ) : (
                    lines.map((l) => (
                      <tr
                        key={l.wineId}
                        className="border-b border-gray-50 last:border-0 dark:border-[#1F1F23]"
                      >
                        <td className="px-3 py-2 text-gray-900 dark:text-zinc-100">
                          {wineLabel(l)}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={l.quantity}
                            onChange={(e) => setQty(l.wineId, e.target.value)}
                            className={cn(ADMIN_FIELD_CLASS, "h-8 w-20")}
                            disabled={saving}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-zinc-400"
                            disabled={saving}
                            onClick={() => removeLine(l.wineId)}
                            aria-label="Ta bort vin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-gray-500 dark:text-zinc-400">
                Lägg till vin
              </Label>
              <div className="flex flex-wrap gap-2">
                <Select
                  value={addWineId || undefined}
                  onValueChange={setAddWineId}
                  disabled={saving || loadingWines || addableWines.length === 0}
                >
                  <SelectTrigger
                    className={cn(ADMIN_FIELD_CLASS, "h-9 min-w-[12rem] flex-1")}
                  >
                    <SelectValue
                      placeholder={
                        loadingWines
                          ? "Laddar…"
                          : addableWines.length === 0
                            ? "Inga fler viner"
                            : "Välj vin"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    {addableWines.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {wineLabel(w)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    ADMIN_OUTLINE_BUTTON_CLASS,
                    "h-9 text-xs font-medium",
                  )}
                  disabled={saving || !addWineId}
                  onClick={addWine}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Lägg till
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "text-xs font-medium")}
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Avbryt
            </Button>
            <Button
              type="button"
              size="sm"
              className={cn(ADMIN_PRIMARY_BUTTON_CLASS, "text-xs font-medium")}
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Sparar…" : "Spara"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
