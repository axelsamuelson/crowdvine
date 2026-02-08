"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PalletStockRow {
  id: string;
  pallet_name: string;
  pallet_id: string;
  inbound: number;
  sold: number;
  remaining: number;
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
}

export function WineB2BPalletStockTable({ wineId, onStockUpdated }: WineB2BPalletStockTableProps) {
  const [data, setData] = useState<PalletStockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { inbound: string; sold: string }>>({});

  const fetchStock = async () => {
    try {
      const res = await fetch(`/api/admin/wines/${wineId}/pallet-stock`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">B2B-lager (från pallar)</CardTitle>
          <CardDescription>
            Lager hämtas från Dirty Wine-pallar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">B2B-lager (från pallar)</CardTitle>
          <CardDescription>
            Lager hämtas från Dirty Wine-pallar. Lägg till vinet på en pall under
            Admin → Pallets → Dirty Wine.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">
            Inga pallar med detta vin. Total tillgänglig: 0
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">B2B-lager (från pallar)</CardTitle>
        <CardDescription>
          Inbound = mottaget på pallen. Uppdateras här och på pall-sidan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pall</TableHead>
              <TableHead className="text-right">Inbound</TableHead>
              <TableHead className="text-right">Sålt</TableHead>
              <TableHead className="text-right">Kvar</TableHead>
              <TableHead className="text-right">Frakt/flaska</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.pallet_name}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    value={editValues[row.id]?.inbound ?? row.inbound}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          inbound: e.target.value,
                          sold: prev[row.id]?.sold ?? String(row.sold),
                        },
                      }))
                    }
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 0 && v !== row.inbound) {
                        updateItem(row.id, "quantity", v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = parseInt(
                          (e.target as HTMLInputElement).value,
                          10,
                        );
                        if (!Number.isNaN(v) && v >= 0 && v !== row.inbound) {
                          updateItem(row.id, "quantity", v);
                        }
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    disabled={updatingId === row.id}
                    className="w-20 h-8 text-right"
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    min={0}
                    value={editValues[row.id]?.sold ?? row.sold}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [row.id]: {
                          ...prev[row.id],
                          inbound: prev[row.id]?.inbound ?? String(row.inbound),
                          sold: e.target.value,
                        },
                      }))
                    }
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v >= 0 && v !== row.sold) {
                        updateItem(row.id, "quantity_sold", v);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = parseInt(
                          (e.target as HTMLInputElement).value,
                          10,
                        );
                        if (!Number.isNaN(v) && v >= 0 && v !== row.sold) {
                          updateItem(row.id, "quantity_sold", v);
                        }
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    disabled={updatingId === row.id}
                    className="w-20 h-8 text-right"
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.remaining}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {(row.shipping_per_bottle_sek ?? 0) > 0
                    ? `${(row.shipping_per_bottle_sek ?? 0).toFixed(2)} kr`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex justify-end gap-6 mt-4 pt-4 border-t text-sm">
          <span>Totalt inbound: {data.total_inbound}</span>
          <span>Sålt: {data.total_sold}</span>
          <span className="font-medium">Tillgängligt: {data.total_remaining}</span>
        </div>
      </CardContent>
    </Card>
  );
}
