"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, ChevronsUpDown, Wine } from "lucide-react";
import { toast } from "sonner";
import { getWineCostCentsExVat } from "@/lib/b2b-wine-cost";
import { format } from "date-fns";

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  cost_amount?: number;
  cost_currency?: string;
  exchange_rate?: number;
  alcohol_tax_cents?: number;
  producers?: { name: string } | null;
  costCentsExVat?: number; // From API when fetched with /with-cost
}

interface PalletItem {
  wine_id: string;
  wine?: Wine;
  quantity: number;
  cost_cents_override: number | null;
}

function getWineSearchLabel(w: Wine): string {
  const name = [w.wine_name, w.vintage].filter(Boolean).join(" ");
  const producer = w.producers?.name;
  return producer ? `${name} — ${producer}` : name;
}

export default function B2BPalletForm({ shipmentId }: { shipmentId?: string }) {
  const router = useRouter();
  const isEdit = !!shipmentId;

  const [name, setName] = useState("");
  const [shippedAt, setShippedAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [palletCostCents, setPalletCostCents] = useState<number | "">("");
  const [items, setItems] = useState<PalletItem[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wineComboboxOpen, setWineComboboxOpen] = useState(false);

  useEffect(() => {
    const fetchWines = async () => {
      try {
        const res = await fetch("/api/admin/wines/with-cost");
        if (res.ok) {
          const data = await res.json();
          setWines(data);
        }
      } catch (err) {
        console.error("Failed to fetch wines:", err);
        toast.error("Kunde inte hämta viner");
      } finally {
        setLoading(false);
      }
    };
    fetchWines();
  }, []);

  useEffect(() => {
    if (isEdit && shipmentId) {
      const fetchShipment = async () => {
        try {
          const res = await fetch(
            `/api/admin/b2b-pallet-shipments/${shipmentId}`,
          );
          if (res.ok) {
            const data = await res.json();
            setName(data.name || "");
            setShippedAt(
              data.shipped_at
                ? format(new Date(data.shipped_at), "yyyy-MM-dd")
                : "",
            );
            setDeliveredAt(
              data.delivered_at
                ? format(new Date(data.delivered_at), "yyyy-MM-dd")
                : "",
            );
            setPalletCostCents(
              data.cost_cents != null ? data.cost_cents : "",
            );
            const mapped = (data.b2b_pallet_shipment_items || []).map(
              (it: any) => ({
                wine_id: it.wine_id,
                wine: it.wines,
                quantity: it.quantity || 0,
                cost_cents_override: it.cost_cents_override,
              }),
            );
            setItems(mapped);
          } else {
            toast.error("Kunde inte hämta pallen");
          }
        } catch (err) {
          toast.error("Kunde inte hämta pallen");
        }
      };
      fetchShipment();
    }
  }, [isEdit, shipmentId]);

  const addWine = (wine: Wine) => {
    if (items.some((i) => i.wine_id === wine.id)) {
      toast.error("Vinet finns redan i listan");
      return;
    }
    setItems([
      ...items,
      {
        wine_id: wine.id,
        wine,
        quantity: 1,
        cost_cents_override: null,
      },
    ]);
    setWineComboboxOpen(false);
  };

  const removeItem = (wineId: string) => {
    setItems(items.filter((i) => i.wine_id !== wineId));
  };

  const updateItem = (
    wineId: string,
    updates: Partial<Pick<PalletItem, "quantity" | "cost_cents_override">>,
  ) => {
    setItems(
      items.map((i) => (i.wine_id === wineId ? { ...i, ...updates } : i)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ange ett namn för pallen");
      return;
    }
    if (items.length === 0) {
      toast.error("Lägg till minst ett vin");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        shipped_at: shippedAt || null,
        delivered_at: deliveredAt || null,
        cost_cents: palletCostCents !== "" ? palletCostCents : null,
        items: items.map((i) => ({
          wine_id: i.wine_id,
          quantity: i.quantity,
          cost_cents_override:
            i.cost_cents_override != null ? i.cost_cents_override : null,
        })),
      };

      const url = isEdit
        ? `/api/admin/b2b-pallet-shipments/${shipmentId}`
        : "/api/admin/b2b-pallet-shipments";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Något gick fel");
      }

      toast.success(isEdit ? "Pallen uppdaterad" : "Pallen skapad");
      router.push(`/admin/pallets?tab=b2b&_=${Date.now()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);

  const availableWines = wines.filter(
    (w) => !items.some((i) => i.wine_id === w.id),
  );

  if (loading && !isEdit) {
    return (
      <div className="space-y-8 max-w-2xl">
        <div className="h-8 w-48 bg-muted/50 animate-pulse rounded-lg" />
        <div className="h-96 bg-muted/30 animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/pallets?tab=b2b">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Redigera pall" : "Ny pall"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Dirty Wine · Vinleverans
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Pallinformation */}
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">
              Pallinformation
            </CardTitle>
            <CardDescription className="text-sm">
              Namn och datum för leveransen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Namn
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Pallet 2024-01"
                className="h-10"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shipped_at" className="text-sm font-medium">
                  Skickad
                </Label>
                <Input
                  id="shipped_at"
                  type="date"
                  value={shippedAt}
                  onChange={(e) => setShippedAt(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivered_at" className="text-sm font-medium">
                  Ankommen
                </Label>
                <Input
                  id="delivered_at"
                  type="date"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pallet_cost" className="text-sm font-medium">
                Palkostnad (ex moms)
              </Label>
              <Input
                id="pallet_cost"
                type="number"
                min={0}
                step={0.01}
                value={palletCostCents === "" ? "" : (palletCostCents / 100).toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPalletCostCents(
                    isNaN(val) || val < 0 ? "" : Math.round(val * 100),
                  );
                }}
                placeholder="t.ex. 5000 (SEK)"
                className="h-10 max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                Transport, frakt och övriga kostnader för pallen i SEK
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Viner på pallen */}
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">
              Viner på pallen
            </CardTitle>
            <CardDescription className="text-sm">
              Sök och lägg till viner. Kostnad hämtas från databasen men kan
              ändras per rad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sökbar vinväljare */}
            <Popover open={wineComboboxOpen} onOpenChange={setWineComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={wineComboboxOpen}
                  className="w-full justify-between h-11 font-normal"
                >
                  <span className="text-muted-foreground truncate">
                    Sök vin att lägga till...
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Sök namn, årgång eller producent..." />
                  <CommandList className="max-h-[280px]">
                    <CommandEmpty>Inga viner hittades.</CommandEmpty>
                    <CommandGroup>
                      {availableWines.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Alla viner är tillagda
                        </div>
                      ) : (
                        availableWines.map((w) => (
                          <CommandItem
                            key={w.id}
                            value={getWineSearchLabel(w)}
                            onSelect={() => addWine(w)}
                          >
                            <Wine className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <span className="truncate">
                              {w.wine_name} {w.vintage}
                              {w.producers?.name && (
                                <span className="text-muted-foreground ml-1">
                                  · {w.producers.name}
                                </span>
                              )}
                            </span>
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Vinlista med scroll */}
            {items.length > 0 && (
              <div className="rounded-lg border">
                <ScrollArea className="h-[min(400px,50vh)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[40%]">Vin</TableHead>
                        <TableHead className="w-[20%] text-right">Antal</TableHead>
                        <TableHead className="w-[30%] text-right">
                          Kostnad (ex moms)
                        </TableHead>
                        <TableHead className="w-[10%]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const wine =
                          item.wine ?? wines.find((w) => w.id === item.wine_id);
                        const defaultCost = wine
                          ? (wine.costCentsExVat ?? getWineCostCentsExVat(wine))
                          : 0;
                        const costCents =
                          item.cost_cents_override ?? defaultCost;
                        return (
                          <TableRow
                            key={item.wine_id}
                            className="group"
                          >
                            <TableCell className="font-medium">
                              {wine
                                ? `${wine.wine_name} ${wine.vintage}`
                                : item.wine_id}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.wine_id, {
                                    quantity: Math.max(
                                      1,
                                      parseInt(e.target.value) || 0,
                                    ),
                                  })
                                }
                                className="w-16 h-8 text-right text-sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                value={
                                  item.cost_cents_override != null
                                    ? (
                                        item.cost_cents_override / 100
                                      ).toFixed(2)
                                    : (defaultCost / 100).toFixed(2)
                                }
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  const cents =
                                    isNaN(val) || val < 0
                                      ? null
                                      : Math.round(val * 100);
                                  updateItem(item.wine_id, {
                                    cost_cents_override: cents,
                                  });
                                }}
                                className="w-24 h-8 text-right text-sm"
                                title="Tomt = kostnad från databasen"
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeItem(item.wine_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            {items.length === 0 && (
              <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
                Inga viner tillagda. Sök och lägg till viner ovan.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Skapa pall"}
          </Button>
          <Button variant="ghost" type="button" asChild>
            <Link href="/admin/pallets?tab=b2b">Avbryt</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
