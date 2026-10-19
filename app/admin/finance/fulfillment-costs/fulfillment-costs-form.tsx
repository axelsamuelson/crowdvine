"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AdminFormSection } from "@/components/admin/admin-form-section";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
  ADMIN_ACTIVE_SWITCH_CLASS,
} from "@/lib/admin-form-styles";
import {
  defaultFinanceFulfillmentCosts,
  type FinanceFulfillmentCosts,
} from "@/lib/finance/fulfillment-costs";
import { Loader2 } from "lucide-react";

function sekFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function centsFromSek(raw: string): number {
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function FulfillmentCostsForm() {
  const [costs, setCosts] = useState<FinanceFulfillmentCosts>(
    defaultFinanceFulfillmentCosts(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<"database" | "defaults">("defaults");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/finance/fulfillment-costs");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Kunde inte hämta");
        if (cancelled) return;
        setCosts(json.costs as FinanceFulfillmentCosts);
        setSource(json.source === "database" ? "database" : "defaults");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Kunde inte hämta fulfillment",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/fulfillment-costs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Kunde inte spara");
      setCosts(json.costs as FinanceFulfillmentCosts);
      setSource("database");
      toast.success("Fulfillment costs sparade");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunde inte spara");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminFormSection
        title="Orderantaganden"
        description={`Källa: ${source === "database" ? "databas" : "standardvärden (spara för att lagra)"}.`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bottles_per_order">Flaskor per order</Label>
            <Input
              id="bottles_per_order"
              type="number"
              min={1}
              className={ADMIN_FIELD_CLASS}
              value={costs.bottlesPerOrder}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  bottlesPerOrder: Math.max(1, parseInt(e.target.value, 10) || 1),
                }))
              }
            />
            <p className={ADMIN_HELP_TEXT_CLASS}>
              Används för att fördela orderkostnader per flaska.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="assumed_ship_quantity">
              Antagen ship-kvantitet (flaskor)
            </Label>
            <Input
              id="assumed_ship_quantity"
              type="number"
              min={1}
              className={ADMIN_FIELD_CLASS}
              value={costs.assumedShipQuantity}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  assumedShipQuantity: Math.max(
                    1,
                    parseInt(e.target.value, 10) || 1,
                  ),
                }))
              }
            />
            <p className={ADMIN_HELP_TEXT_CLASS}>
              Fördelar inkommande pallfrakt per flaska.
            </p>
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Frakt & transport"
        description="Kundfrakt (intäkt) och utgående/inkommande kostnader."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ship_rev">
              Kundfrakt per order (SEK{costs.shippingPriceIncludesVat ? ", inkl. moms" : ", exkl. moms"})
            </Label>
            <Input
              id="ship_rev"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={sekFromCents(costs.shippingRevenueGrossCentsPerOrder)}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  shippingRevenueGrossCentsPerOrder: centsFromSek(e.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-3 py-3 dark:border-zinc-800 sm:mt-6">
            <div>
              <Label htmlFor="ship_vat">Kundfrakt inkl. moms</Label>
              <p className={ADMIN_HELP_TEXT_CLASS}>B2C normalt på.</p>
            </div>
            <Switch
              id="ship_vat"
              checked={costs.shippingPriceIncludesVat}
              onCheckedChange={(v) =>
                setCosts((c) => ({ ...c, shippingPriceIncludesVat: v }))
              }
              className={ADMIN_ACTIVE_SWITCH_CLASS}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="outbound">Utgående frakt per order (SEK)</Label>
            <Input
              id="outbound"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={sekFromCents(costs.outboundCarrierCostCentsPerOrder)}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  outboundCarrierCostCentsPerOrder: centsFromSek(e.target.value),
                }))
              }
            />
            <p className={ADMIN_HELP_TEXT_CLASS}>
              Last-mile / carrier-kostnad per leverans.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="inbound">Inkommande pallfrakt totalt (SEK)</Label>
            <Input
              id="inbound"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={sekFromCents(costs.inboundFreightTotalCents)}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  inboundFreightTotalCents: centsFromSek(e.target.value),
                }))
              }
            />
            <p className={ADMIN_HELP_TEXT_CLASS}>
              Fördelas över antagen ship-kvantitet.
            </p>
          </div>
        </div>
      </AdminFormSection>

      <AdminFormSection
        title="Transaktion & reserv"
        description="Stripe, EPR och retur/svinn-reserv."
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="stripe_pct">Stripe-avgift (%)</Label>
            <Input
              id="stripe_pct"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={(costs.stripeFeePercent * 100).toFixed(2)}
              onChange={(e) => {
                const pct = Number(e.target.value);
                setCosts((c) => ({
                  ...c,
                  stripeFeePercent: Number.isFinite(pct)
                    ? Math.max(0, pct) / 100
                    : 0,
                }));
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stripe_fixed">Stripe fast avgift per order (SEK)</Label>
            <Input
              id="stripe_fixed"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={sekFromCents(costs.stripeFeeFixedCentsPerOrder)}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  stripeFeeFixedCentsPerOrder: centsFromSek(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="epr">EPR per flaska (SEK)</Label>
            <Input
              id="epr"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={sekFromCents(costs.eprCentsPerBottle)}
              onChange={(e) =>
                setCosts((c) => ({
                  ...c,
                  eprCentsPerBottle: centsFromSek(e.target.value),
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund">Retur/svinn-reserv (% av produktnetto)</Label>
            <Input
              id="refund"
              type="number"
              min={0}
              step={0.01}
              className={ADMIN_FIELD_CLASS}
              value={(costs.refundBreakageReserveRate * 100).toFixed(2)}
              onChange={(e) => {
                const pct = Number(e.target.value);
                setCosts((c) => ({
                  ...c,
                  refundBreakageReserveRate: Number.isFinite(pct)
                    ? Math.max(0, pct) / 100
                    : 0,
                }));
              }}
            />
          </div>
        </div>
      </AdminFormSection>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={save}
          disabled={saving}
          className={ADMIN_PRIMARY_BUTTON_CLASS}
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sparar…
            </>
          ) : (
            "Spara fulfillment costs"
          )}
        </Button>
      </div>
    </div>
  );
}
