"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { DEFAULT_ALCOHOL_TAX_CENTS } from "@/lib/wine-alcohol-tax";

type OverviewPayload = {
  channel: string;
  period: { key: string; start: string; end: string };
  forecastShipQty: number;
  breakdown: {
    bottles: number;
    orders: number;
    bottlesKnown: number;
    bottlesIncomplete: number;
    productNetRevenueCents: number;
    shippingNetRevenueCents: number;
    gm1Cents: number;
    gm1PercentOfProductNet: number | null;
    gm2Cents: number;
    gm2PercentOfProductNet: number | null;
    gm3Cents: number;
    gm3PercentOfProductNet: number | null;
    opexAllocatedCents: number;
    operatingContributionCents: number;
    producerPurchaseCostCents: number;
    alcoholExciseCents: number;
    paymentFeesCents: number;
    outboundCarrierCostCents: number;
    eprCents: number;
    refundBreakageReserveCents: number;
    inboundFreightCents: number;
    inboundAllocationKind: string;
    coveragePercent: number | null;
    completeness: string;
    warnings: Array<{ code: string; message: string }>;
  };
  wineRows: Array<{
    wineId: string;
    bottles: number;
    productNetCents: number;
    gm1Cents: number;
    gm2Cents: number;
  }>;
  shippingAudit: {
    scannedItems: number;
    affectedItems: number;
    affectedBottles: number;
    reconstructableItems: number;
    nonReconstructableItems: number;
  };
  opex: {
    entries: Array<Record<string, unknown>>;
    allocatedCents: number;
    sharedUnallocatedCents: number;
    byCategory: Record<string, number>;
  };
  breakEven:
    | { ok: true; bottlesRequired: number; netRevenueRequiredCents: number | null }
    | { ok: false; reason: string };
  scenarioDefaults?: {
    medianPurchaseCostSek: number | null;
    medianPurchaseCostCents: number | null;
    purchaseSampleSize: number;
    purchaseSkippedCount: number;
  };
  disclaimer: string;
};

function sek(cents: number): string {
  return `${(Math.round(cents) / 100).toLocaleString("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} SEK`;
}

function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(1)}%`;
}

function Kpi({
  label,
  value,
  sub,
  scenario,
}: {
  label: string;
  value: string;
  sub?: string;
  scenario?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 bg-white dark:bg-[#0F0F12]",
        scenario
          ? "border-amber-300/80 dark:border-amber-700/60"
          : "border-gray-200 dark:border-[#1F1F23]",
      )}
    >
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
        {scenario ? " · prognos" : ""}
      </div>
      <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-white tabular-nums">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</div>
      ) : null}
    </div>
  );
}

function WaterfallRow({
  label,
  cents,
  denom,
  bold,
}: {
  label: string;
  cents: number;
  denom: number;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5 border-b border-gray-100 dark:border-zinc-800",
        bold && "font-semibold",
      )}
    >
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <span className="text-sm tabular-nums text-gray-900 dark:text-white">
        {sek(cents)}
        <span className="ml-3 text-xs text-gray-500">{pct(percent(cents, denom))}</span>
      </span>
    </div>
  );
}

function percent(n: number, d: number): number | null {
  if (d <= 0) return null;
  return Math.round((n / d) * 10000) / 100;
}


function opexCadenceSv(c: string): string {
  switch (c) {
    case "monthly":
      return "månadsvis";
    case "annual":
      return "årligen";
    case "one_off":
      return "engång";
    default:
      return c;
  }
}

function opexChannelSv(c: string): string {
  switch (c) {
    case "shared":
      return "delad";
    case "pact":
      return "PACT";
    case "dirtywine":
      return "Dirtywine";
    default:
      return c;
  }
}

function completenessSv(status: string): string {
  switch (status) {
    case "complete":
      return "komplett";
    case "partial":
      return "partiell";
    case "known":
      return "känd";
    case "missing":
      return "saknas";
    case "legacy":
      return "äldre data";
    default:
      return status;
  }
}


type ScenarioUnit = {
  productNetCentsPerBottle: number;
  shippingNetCentsPerBottle: number;
  purchaseCostCentsPerBottle: number;
  exciseCentsPerBottle: number;
  paymentFeeCentsPerBottle: number;
  outboundCentsPerBottle: number;
  eprCentsPerBottle: number;
  refundReserveCentsPerBottle: number;
  inboundCentsPerBottle: number;
  gm1CentsPerBottle: number;
  gm2CentsPerBottle: number;
  gm3CentsPerBottle: number;
};

function ScenarioMarginBridge({
  title,
  unit,
  volumeBottles,
  opexAllocatedCents,
}: {
  title: string;
  unit: ScenarioUnit;
  volumeBottles: number;
  /** Period OpEx allocated onto this scenario volume (öre total). */
  opexAllocatedCents: number;
}) {
  const vol = Math.max(1, Math.floor(volumeBottles));
  const scale = (cents: number) => cents * vol;
  const denom = scale(unit.productNetCentsPerBottle);
  const opex = Math.max(0, Math.round(opexAllocatedCents));
  const gm3Total = scale(unit.gm3CentsPerBottle);
  const operating = gm3Total - opex;
  return (
    <div className="rounded-xl border border-amber-300/80 dark:border-amber-700/50 bg-white dark:bg-[#0F0F12] p-4">
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mb-3">
        Scenariots resultaträkning · × {vol} flaskor · inte utfall
      </p>
      <div className="space-y-0.5">
        <WaterfallRow
          label="Netto produktintäkter"
          cents={scale(unit.productNetCentsPerBottle)}
          denom={denom}
          bold
        />
        <WaterfallRow
          label="− Inköpskostnad vin"
          cents={-scale(unit.purchaseCostCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Alkoholskatt"
          cents={-scale(unit.exciseCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="= GM1"
          cents={scale(unit.gm1CentsPerBottle)}
          denom={denom}
          bold
        />
        <WaterfallRow
          label="+ Fraktintäkt netto"
          cents={scale(unit.shippingNetCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Betalningsavgifter"
          cents={-scale(unit.paymentFeeCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Utgående frakt"
          cents={-scale(unit.outboundCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Inkommande frakt (prognos)"
          cents={-scale(unit.inboundCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Producentansvar (EPR)"
          cents={-scale(unit.eprCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="− Reserv retur/svinn"
          cents={-scale(unit.refundReserveCentsPerBottle)}
          denom={denom}
        />
        <WaterfallRow
          label="= GM2"
          cents={scale(unit.gm2CentsPerBottle)}
          denom={denom}
          bold
        />
        <WaterfallRow label="− OpEx" cents={-opex} denom={denom} />
        <WaterfallRow
          label="= Rörelseresultat"
          cents={operating}
          denom={denom}
          bold
        />
      </div>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        Per flaska: GM1 {sek(unit.gm1CentsPerBottle)} · GM2{" "}
        {sek(unit.gm2CentsPerBottle)} · GM3 {sek(unit.gm3CentsPerBottle)}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        Netto bidrag frakt / flaska:{" "}
        {sek(unit.shippingNetCentsPerBottle - unit.outboundCentsPerBottle)}
        {opex > 0
          ? ` · OpEx är periodens allokering (${sek(opex)}) på denna volym`
          : " · OpEx tom tills poster finns"}
      </p>
    </div>
  );
}

function MarginHeatmap({
  heatmap,
  currentPrice,
  proposedPrice,
  currentShipQty,
  volumeBottles,
  opexAllocatedCents,
  scenarioAssumptions,
  onApplyScenario,
}: {
  heatmap: {
    prices: number[];
    shipQtys: number[];
    cells: Array<{
      price: number;
      shipQty: number;
      gm1CentsPerBottle?: number;
      gm1Percent?: number | null;
      gm2CentsPerBottle: number;
      gm2Percent: number | null;
      gm3CentsPerBottle?: number;
      gm3Percent?: number | null;
    }>;
  };
  currentPrice: number;
  proposedPrice: number;
  currentShipQty: number;
  volumeBottles: number;
  opexAllocatedCents: number;
  scenarioAssumptions: {
    priceIncludesVat: boolean;
    vatRate: number;
    bottlesPerOrder: number;
    eprCentsPerBottle: number;
    refundBreakageReserveRate: number;
    stripeFeePercent: number;
    stripeFeeFixedCentsPerOrder: number;
    shippingRevenueGrossCentsPerOrder: number;
    shippingPriceIncludesVat: boolean;
    outboundCarrierCostCentsPerOrder: number;
    inboundFreightTotalCents: number;
    /** 1 = full excise, 0.5 = half-rate producer rebate. */
    exciseRateMultiplier?: number;
  };
  onApplyScenario: (selection: { price: number; shipQty: number }) => void;
}) {
  type HeatMetric =
    | "gm1_sek"
    | "gm1_pct"
    | "gm2_sek"
    | "gm2_pct"
    | "operating_sek";
  const [metric, setMetric] = useState<HeatMetric>("gm1_sek");
  const [selected, setSelected] = useState<{
    price: number;
    shipQty: number;
    gm1Cents: number;
    gm1Percent: number | null;
    gm2Cents: number;
    gm2Percent: number | null;
    gm3Cents: number;
    operatingCents: number;
  } | null>(null);
  const [wineRows, setWineRows] = useState<
    Array<Record<string, unknown>> | null
  >(null);
  const [wineLoading, setWineLoading] = useState(false);
  const [wineError, setWineError] = useState<string | null>(null);
  const [pactPriceUpdating, setPactPriceUpdating] = useState(false);

  const vol = Math.max(1, Math.floor(volumeBottles) || 1);
  const opex = Math.max(0, Math.round(opexAllocatedCents));

  const operatingCentsFor = (
    c: (typeof heatmap.cells)[number] | undefined,
  ): number => {
    if (!c) return 0;
    const gm3 = c.gm3CentsPerBottle ?? c.gm2CentsPerBottle;
    return gm3 * vol - opex;
  };

  const byKey = useMemo(() => {
    const m = new Map<string, (typeof heatmap.cells)[number]>();
    for (const c of heatmap.cells) m.set(`${c.price}:${c.shipQty}`, c);
    return m;
  }, [heatmap.cells]);

  const isPct = metric === "gm1_pct" || metric === "gm2_pct";
  const isGm1 = metric === "gm1_sek" || metric === "gm1_pct";
  const isOperating = metric === "operating_sek";

  /** Colour follows displayed metric (GM2 for GM views; RR for rörelseresultat). */
  const colorValue = (c: (typeof heatmap.cells)[number] | undefined): number => {
    if (!c) return 0;
    if (isOperating) return operatingCentsFor(c);
    return isPct ? (c.gm2Percent ?? 0) : c.gm2CentsPerBottle;
  };

  /**
   * Absolute conditional formatting (nollcentrerad):
   * − negativt → aldrig grönt (lite minus = orange, mycket minus = rött)
   * − noll → neutralt
   * − positivt → grönt
   */
  const colorFor = (v: number) => {
    if (!Number.isFinite(v)) return "hsl(0 0% 92%)";

    if (v < 0) {
      const negScale = isPct
        ? 20
        : isOperating
          ? Math.max(opex, 100_000) // −OpEx / −1000 SEK
          : 8_000; // −80 SEK/flaska
      const intensity = Math.min(1, Math.abs(v) / negScale);
      const h = 36 * (1 - intensity);
      const s = 72 + intensity * 12;
      const l = 88 - intensity * 24;
      return `hsl(${h} ${s}% ${l}%)`;
    }

    if (v === 0) return "hsl(45 25% 93%)";

    const posScale = isPct
      ? 40
      : isOperating
        ? Math.max(opex * 2, 200_000) // +2×OpEx / +2000 SEK
        : 10_000; // +100 SEK/flaska
    const intensity = Math.min(1, v / posScale);
    const h = 100 + intensity * 40;
    const s = 48 + intensity * 22;
    const l = 90 - intensity * 22;
    return `hsl(${h} ${s}% ${l}%)`;
  };

  const formatCell = (c: (typeof heatmap.cells)[number] | undefined) => {
    if (!c) return "—";
    if (isOperating) {
      return (Math.round(operatingCentsFor(c)) / 100).toLocaleString("sv-SE", {
        maximumFractionDigits: 0,
      });
    }
    if (!isPct) {
      const ore = isGm1 ? (c.gm1CentsPerBottle ?? 0) : c.gm2CentsPerBottle;
      return (Math.round(ore) / 100).toLocaleString("sv-SE", {
        maximumFractionDigits: 0,
      });
    }
    const p = isGm1 ? c.gm1Percent : c.gm2Percent;
    return p == null ? "—" : `${p.toFixed(0)}%`;
  };

  const metricButtons: Array<{ id: HeatMetric; label: string }> = [
    { id: "gm1_sek", label: "GM1 SEK/flaska" },
    { id: "gm1_pct", label: "GM1 %" },
    { id: "gm2_sek", label: "GM2 SEK/flaska" },
    { id: "gm2_pct", label: "GM2 %" },
    { id: "operating_sek", label: "Rörelseresultat" },
  ];

  const openCell = async (price: number, shipQty: number) => {
    const cell = byKey.get(`${price}:${shipQty}`);
    if (!cell) return;
    const gm3Cents = cell.gm3CentsPerBottle ?? cell.gm2CentsPerBottle;
    const operatingCents = operatingCentsFor(cell);
    const sel = {
      price,
      shipQty,
      gm1Cents: cell.gm1CentsPerBottle ?? 0,
      gm1Percent: cell.gm1Percent ?? null,
      gm2Cents: cell.gm2CentsPerBottle,
      gm2Percent: cell.gm2Percent,
      gm3Cents,
      operatingCents,
    };
    setSelected(sel);
    setWineRows(null);
    setWineError(null);
    setWineLoading(true);

    // Same RR at fixed OpEx/volume ⇔ same GM3/flaska (GM3 = GM2 i finansmodellen).
    const targetKind =
      metric === "gm1_sek"
        ? "gm1_sek_per_bottle"
        : metric === "gm1_pct"
          ? "gm1_percent"
          : metric === "gm2_sek"
            ? "gm2_sek_per_bottle"
            : metric === "gm2_pct"
              ? "gm2_percent"
              : "gm3_sek_per_bottle";
    const target =
      metric === "gm1_sek"
        ? Math.round(sel.gm1Cents) / 100
        : metric === "gm1_pct"
          ? (sel.gm1Percent ?? 0)
          : metric === "gm2_sek"
            ? Math.round(sel.gm2Cents) / 100
            : metric === "gm2_pct"
              ? (sel.gm2Percent ?? 0)
              : Math.round(sel.gm3Cents) / 100;

    try {
      const res = await fetch("/api/admin/finance/assortment-margin-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetKind,
          target,
          assumptions: {
            ...scenarioAssumptions,
            assumedShipQuantity: shipQty,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setWineRows((json.rows as Array<Record<string, unknown>>) || []);
    } catch (e) {
      setWineError(e instanceof Error ? e.message : "Kunde inte hämta viner");
    } finally {
      setWineLoading(false);
    }
  };

  const okWinePrices = useMemo(() => {
    if (!wineRows) return [];
    return wineRows
      .filter((row) => row.ok && Number(row.requiredRetailMajor) > 0)
      .map((row) => ({
        wineId: String(row.wineId),
        requiredRetailMajor: Number(row.requiredRetailMajor),
      }));
  }, [wineRows]);

  const updatePactPrices = async () => {
    if (okWinePrices.length === 0) {
      toast.error("Inga vinpriser att uppdatera");
      return;
    }
    setPactPriceUpdating(true);
    try {
      const res = await fetch("/api/admin/finance/apply-pact-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prices: okWinePrices,
          exciseRateMultiplier: scenarioAssumptions.exciseRateMultiplier ?? 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      const updated = Number(json.updated) || 0;
      const failed = Number(json.failed) || 0;
      if (failed > 0) {
        toast.warning(
          `Uppdaterade ${updated} PACT-priser · ${failed} misslyckades`,
        );
      } else {
        toast.success(`Uppdaterade ${updated} PACT-priser`);
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Kunde inte uppdatera PACT-priser",
      );
    } finally {
      setPactPriceUpdating(false);
    }
  };

  const targetLabel = selected
    ? metric === "gm1_sek"
      ? `GM1 ${sek(selected.gm1Cents)}/flaska`
      : metric === "gm1_pct"
        ? `GM1 ${pct(selected.gm1Percent)}`
        : metric === "gm2_sek"
          ? `GM2 ${sek(selected.gm2Cents)}/flaska`
          : metric === "gm2_pct"
            ? `GM2 ${pct(selected.gm2Percent)}`
            : `Rörelseresultat ${sek(selected.operatingCents)} (GM3 ${sek(selected.gm3Cents)}/flaska × ${vol})`
    : "";

  return (
    <div className="rounded-xl border border-amber-300/80 dark:border-amber-700/50 bg-white dark:bg-[#0F0F12] p-4 space-y-3 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">
            Marginalkarta · pris × ship-antal
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-0.5">
            {isOperating
              ? `Rörelseresultat = GM3 × ${vol} flaskor − OpEx (${sek(opex)}). Färg följer RR. Klicka för vinpriser med samma GM3.`
              : "Siffror = vald metri (GM1/GM2). Färg följer GM2. Klicka en ruta för vinpriser med samma marginal."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {metricButtons.map((btn) => (
            <Button
              key={btn.id}
              type="button"
              size="sm"
              variant={metric === btn.id ? "default" : "outline"}
              onClick={() => setMetric(btn.id)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="max-h-[min(70vh,36rem)] overflow-auto rounded-lg border border-gray-200 dark:border-zinc-800">
        <div
          className="inline-grid gap-px bg-gray-200 dark:bg-zinc-800 min-w-full"
          style={{
            gridTemplateColumns: `3.5rem repeat(${heatmap.prices.length}, minmax(2.4rem, 1fr))`,
          }}
        >
          <div className="sticky top-0 left-0 z-30 bg-gray-50 dark:bg-zinc-900 p-1 text-[10px] text-gray-500 flex items-end justify-center shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
            Ship ↓ / Pris →
          </div>
          {heatmap.prices.map((price) => {
            const isCurrent = price === currentPrice;
            const isProposed = price === proposedPrice;
            return (
              <div
                key={price}
                className={cn(
                  "sticky top-0 z-20 bg-gray-50 dark:bg-zinc-900 p-1 text-[10px] text-center tabular-nums text-gray-600 dark:text-gray-300 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]",
                  (isCurrent || isProposed) &&
                    "font-semibold text-amber-800 dark:text-amber-200",
                )}
                title={
                  isCurrent
                    ? "Nuvarande pris"
                    : isProposed
                      ? "Föreslaget pris"
                      : undefined
                }
              >
                {price}
              </div>
            );
          })}

          {[...heatmap.shipQtys].reverse().map((shipQty) => (
            <div key={`row-${shipQty}`} className="contents">
              <div
                className={cn(
                  "sticky left-0 z-10 bg-gray-50 dark:bg-zinc-900 p-1 text-[10px] tabular-nums text-gray-600 dark:text-gray-300 flex items-center justify-end pr-2 shadow-[1px_0_0_0_rgba(0,0,0,0.06)]",
                  shipQty === currentShipQty &&
                    "font-semibold text-amber-800 dark:text-amber-200",
                )}
              >
                {shipQty}
              </div>
              {heatmap.prices.map((price) => {
                const cell = byKey.get(`${price}:${shipQty}`);
                const isFocus =
                  (price === currentPrice || price === proposedPrice) &&
                  shipQty === currentShipQty;
                return (
                  <button
                    type="button"
                    key={`${price}:${shipQty}`}
                    className={cn(
                      "p-1 text-[10px] tabular-nums text-center text-gray-900 dark:text-zinc-100 min-h-8 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-inset hover:ring-amber-400/80",
                      isFocus && "ring-2 ring-inset ring-amber-500",
                    )}
                    style={{ backgroundColor: colorFor(colorValue(cell)) }}
                    title={
                      cell
                        ? `Klicka för vinpriser · Pris ${price} SEK · ship ${shipQty} · GM1 ${sek(cell.gm1CentsPerBottle ?? 0)} · GM2 ${sek(cell.gm2CentsPerBottle)} · RR ${sek(operatingCentsFor(cell))}`
                        : undefined
                    }
                    onClick={() => void openCell(price, shipQty)}
                  >
                    {formatCell(cell)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
        <span>Mycket minus</span>
        <div
          className="h-2 w-16 rounded"
          style={{
            background: "linear-gradient(90deg, hsl(0 80% 72%), hsl(36 75% 82%))",
          }}
        />
        <span>Lite minus</span>
        <div className="h-2 w-6 rounded" style={{ background: "hsl(45 25% 93%)" }} />
        <span>0</span>
        <div
          className="h-2 w-16 rounded"
          style={{
            background:
              "linear-gradient(90deg, hsl(100 50% 88%), hsl(140 65% 70%))",
          }}
        />
        <span>Plus</span>
      </div>

      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setWineRows(null);
            setWineError(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Vinpriser för vald marginal</DialogTitle>
          </DialogHeader>
          {selected ? (
            <p className="text-xs text-gray-500">
              Mål: <strong>{targetLabel}</strong> · kartcell{" "}
              {selected.price} SEK · ship {selected.shipQty}. Priset per vin
              löses så att vinet når samma marginal med scenariots
              frakt-/avgiftsantaganden.
            </p>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-200 dark:border-zinc-800">
            {wineLoading ? (
              <p className="p-4 text-sm text-gray-500">Beräknar priser…</p>
            ) : null}
            {wineError ? (
              <p className="p-4 text-sm text-red-600">{wineError}</p>
            ) : null}
            {wineRows && !wineLoading ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-zinc-900 text-xs text-gray-500">
                  <tr>
                    <th className="p-2 text-left">Vin</th>
                    <th className="p-2 text-left">Inköp</th>
                    <th className="p-2 text-left">Krävt pris</th>
                    <th className="p-2 text-left">GM1</th>
                    <th className="p-2 text-left">GM1 %</th>
                    <th className="p-2 text-left">GM2</th>
                  </tr>
                </thead>
                <tbody>
                  {wineRows.map((row) => (
                    <tr
                      key={String(row.wineId)}
                      className="border-t border-gray-100 dark:border-zinc-800"
                    >
                      <td className="p-2">
                        {String(row.wineName)}
                        {row.vintage != null ? ` ${row.vintage}` : ""}
                      </td>
                      <td className="p-2 tabular-nums">
                        {sek(Number(row.purchaseCostCents) || 0)}
                      </td>
                      <td className="p-2 tabular-nums font-medium">
                        {row.ok
                          ? `${Number(row.requiredRetailMajor).toLocaleString("sv-SE", { maximumFractionDigits: 0 })} SEK`
                          : "—"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {row.ok ? sek(Number(row.gm1Cents) || 0) : "—"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {row.ok
                          ? pct(
                              typeof row.gm1Percent === "number"
                                ? row.gm1Percent
                                : null,
                            )
                          : "—"}
                      </td>
                      <td className="p-2 tabular-nums">
                        {row.ok ? sek(Number(row.gm2Cents) || 0) : "—"}
                      </td>
                    </tr>
                  ))}
                  {wineRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-4 text-center text-gray-500"
                      >
                        Inga live-viner med inköpskostnad
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            ) : null}
          </div>
          {selected ? (
            <DialogFooter className="gap-2 sm:flex-row sm:justify-between">
              <p className="text-xs text-gray-500 self-center">
                Applicerar {selected.price} SEK och ship {selected.shipQty} på
                scenariot.
              </p>
              <div className="flex flex-wrap gap-2 justify-end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        pactPriceUpdating ||
                        wineLoading ||
                        okWinePrices.length === 0
                      }
                    >
                      {pactPriceUpdating
                        ? "Uppdaterar…"
                        : "Uppdatera PACT Priser"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Uppdatera live PACT-priser?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Skriver över listpriset (
                        {okWinePrices.length} viner) med de krävda priser som
                        visas i tabellen. Alkoholskatt och marginal % uppdateras
                        så att de matchar scenariot. Detta påverkar shoppen —
                        inte bara simuleringen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void updatePactPrices()}
                      >
                        Uppdatera PACT Priser
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  type="button"
                  onClick={() => {
                    onApplyScenario({
                      price: selected.price,
                      shipQty: selected.shipQty,
                    });
                    setSelected(null);
                    setWineRows(null);
                    setWineError(null);
                  }}
                >
                  Applicera
                </Button>
              </div>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScenarioSideTables({
  title,
  priceTitle,
  palletFillTable,
  sensitivity,
}: {
  title: string;
  priceTitle: string;
  palletFillTable: Array<Record<string, number>>;
  sensitivity: Array<Record<string, number>>;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-amber-300/80 dark:border-amber-700/50">
        <div className="px-3 pt-2 text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
          {title}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40">
            <tr>
              <th className="p-2 text-left">Ship-antal</th>
              <th className="p-2 text-left">Inkommande/flaska</th>
              <th className="p-2 text-left">GM1/flaska</th>
              <th className="p-2 text-left">GM1%</th>
              <th className="p-2 text-left">GM2/flaska</th>
              <th className="p-2 text-left">GM2%</th>
            </tr>
          </thead>
          <tbody>
            {palletFillTable.map((row) => (
              <tr
                key={row.shipQty}
                className="border-t border-gray-100 dark:border-zinc-800"
              >
                <td className="p-2">{row.shipQty}</td>
                <td className="p-2">{sek(row.inboundPerBottleCents)}</td>
                <td className="p-2">{sek(row.gm1PerBottleCents)}</td>
                <td className="p-2">{pct(row.gm1Percent)}</td>
                <td className="p-2">
                  {sek(row.gm2PerBottleCents ?? row.gm3PerBottleCents)}
                </td>
                <td className="p-2">
                  {pct(row.gm2Percent ?? row.gm3Percent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-x-auto rounded-xl border border-amber-300/80 dark:border-amber-700/50">
        <div className="px-3 pt-2 text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
          {priceTitle}
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40">
            <tr>
              <th className="p-2 text-left">Δ pris</th>
              <th className="p-2 text-left">GM1%</th>
              <th className="p-2 text-left">GM1 SEK</th>
              <th className="p-2 text-left">GM2%</th>
              <th className="p-2 text-left">GM2 SEK</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((row) => (
              <tr
                key={row.priceDeltaSek}
                className="border-t border-gray-100 dark:border-zinc-800"
              >
                <td className="p-2">
                  {row.priceDeltaSek >= 0 ? "+" : ""}
                  {row.priceDeltaSek} → {row.sellingPriceMajor}
                </td>
                <td className="p-2">{pct(row.gm1Percent)}</td>
                <td className="p-2">{sek(row.gm1CentsPerBottle)}</td>
                <td className="p-2">{pct(row.gm2Percent)}</td>
                <td className="p-2">
                  {sek(row.gm2CentsPerBottle ?? row.gm3CentsPerBottle)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinanceDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const channel = searchParams.get("channel") || "all";
  const period = searchParams.get("period") || "this_month";
  const mode = searchParams.get("mode") || "actuals";
  const forecastShipQty = searchParams.get("forecast_ship_qty") || "240";

  const [data, setData] = useState<OverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulator state (ephemeral)
  const [simPrice, setSimPrice] = useState(229);
  const [simProposed, setSimProposed] = useState(299);
  const [simPurchase, setSimPurchase] = useState(143.37);
  const [simPurchaseTouched, setSimPurchaseTouched] = useState(false);
  const [simShipOrder, setSimShipOrder] = useState(99);
  const [simOutbound, setSimOutbound] = useState(69);
  const [simInbound, setSimInbound] = useState(4262.63);
  const [simExciseHalfRate, setSimExciseHalfRate] = useState(false);
  const [simShipQty, setSimShipQty] = useState(
    () => Number(forecastShipQty) || 240,
  );
  const [simVolumeBottles, setSimVolumeBottles] = useState(
    () => Number(forecastShipQty) || 240,
  );
  const [simVolumeTouched, setSimVolumeTouched] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(
    null,
  );
  const [opexName, setOpexName] = useState("");
  const [opexAmount, setOpexAmount] = useState("");
  const [opexCadence, setOpexCadence] = useState("monthly");
  const [opexChannel, setOpexChannel] = useState("shared");

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        channel,
        period,
        forecast_ship_qty: forecastShipQty,
      });
      const res = await fetch(`/api/admin/finance/overview?${q}`);
      if (!res.ok) throw new Error((await res.json()).error || res.statusText);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte ladda");
    } finally {
      setLoading(false);
    }
  }, [channel, period, forecastShipQty]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const median = data?.scenarioDefaults?.medianPurchaseCostSek;
    if (simPurchaseTouched || median == null || !Number.isFinite(median)) return;
    setSimPurchase(median);
  }, [data?.scenarioDefaults?.medianPurchaseCostSek, simPurchaseTouched]);

  const b = data?.breakdown;
  const denom = b?.productNetRevenueCents ?? 0;

  const simExciseCentsPerBottle = simExciseHalfRate
    ? Math.round(DEFAULT_ALCOHOL_TAX_CENTS * 0.5)
    : DEFAULT_ALCOHOL_TAX_CENTS;

  const runSimulate = async (overrides?: {
    proposedPrice?: number;
    shipQty?: number;
    volumeBottles?: number;
  }) => {
    const shipQty = overrides?.shipQty ?? simShipQty;
    const proposedPrice = overrides?.proposedPrice ?? simProposed;
    const volume = Math.max(
      1,
      Math.floor(overrides?.volumeBottles ?? simVolumeBottles) || 100,
    );
    const input = {
      sellingPriceMajor: simPrice,
      priceIncludesVat: channel !== "dirtywine",
      vatRate: 0.25,
      bottles: volume,
      bottlesPerOrder: 6,
      purchaseCostCentsPerBottle: Math.round(simPurchase * 100),
      purchaseCostCurrency: "SEK",
      purchaseFxRate: 1,
      exciseCentsPerBottle: simExciseCentsPerBottle,
      eprCentsPerBottle: 50,
      refundBreakageReserveRate: 0.01,
      stripeFeePercent: channel === "dirtywine" ? 0 : 0.015,
      stripeFeeFixedCentsPerOrder: channel === "dirtywine" ? 0 : 180,
      shippingRevenueGrossCentsPerOrder: Math.round(simShipOrder * 100),
      shippingPriceIncludesVat: channel !== "dirtywine",
      outboundCarrierCostCentsPerOrder: Math.round(simOutbound * 100),
      inboundFreightTotalCents: Math.round(simInbound * 100),
      assumedShipQuantity: shipQty,
    };
    const res = await fetch("/api/admin/finance/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "scenario",
        input,
        proposed: { sellingPriceMajor: proposedPrice },
        volumeBottles: volume,
      }),
    });
    setSimResult(await res.json());
  };

  const applyHeatmapSelection = (selection: {
    price: number;
    shipQty: number;
  }) => {
    setSimProposed(selection.price);
    setSimShipQty(selection.shipQty);
    const volume = !simVolumeTouched
      ? selection.shipQty
      : simVolumeBottles;
    if (!simVolumeTouched) setSimVolumeBottles(selection.shipQty);
    void runSimulate({
      proposedPrice: selection.price,
      shipQty: selection.shipQty,
      volumeBottles: volume,
    });
  };

  const addOpex = async () => {
    const amountSek = Number(opexAmount);
    if (!opexName.trim() || !Number.isFinite(amountSek)) return;
    await fetch("/api/admin/finance/opex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: opexName.trim(),
        amount_cents: Math.round(amountSek * 100),
        cadence: opexCadence,
        channel: opexChannel,
        category: "other",
        starts_on: new Date().toISOString().slice(0, 10),
      }),
    });
    setOpexName("");
    setOpexAmount("");
    await load();
  };

  const deactivateOpex = async (id: string) => {
    await fetch(`/api/admin/finance/opex/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    await load();
  };

  const wineSorted = useMemo(() => {
    return [...(data?.wineRows ?? [])].sort((a, b) => b.gm2Cents - a.gm2Cents);
  }, [data?.wineRows]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {data?.disclaimer ??
          "Intern redovisning — inte bokslut, momsdeklaration eller reviderad resultaträkning."}
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Kanal</Label>
          <Select value={channel} onValueChange={(v) => setParam("channel", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla</SelectItem>
              <SelectItem value="pact">PACT</SelectItem>
              <SelectItem value="dirtywine">Dirtywine</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Period</Label>
          <Select value={period} onValueChange={(v) => setParam("period", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Denna månad</SelectItem>
              <SelectItem value="last_month">Förra månaden</SelectItem>
              <SelectItem value="last_30">Senaste 30 dagarna</SelectItem>
              <SelectItem value="quarter">Kvartal</SelectItem>
              <SelectItem value="ytd">Hittills i år</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Vy</Label>
          <Select value={mode} onValueChange={(v) => setParam("mode", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actuals">Utfall</SelectItem>
              <SelectItem value="scenarios">Prisscenarier</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {channel !== "dirtywine" ? (
          <div className="space-y-1">
            <Label className="text-xs">Prognos ship-antal (GM3)</Label>
            <Select
              value={forecastShipQty}
              onValueChange={(v) => setParam("forecast_ship_qty", v)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[120, 180, 240, 360, 480, 720].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => void load()}>
          Uppdatera
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laddar finans…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {mode === "actuals" && b ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi
              label="Netto produktintäkter"
              value={sek(b.productNetRevenueCents)}
              sub={`${b.orders} ordrar · ${b.bottles} flaskor`}
            />
            <Kpi
              label="GM1"
              value={sek(b.gm1Cents)}
              sub={pct(b.gm1PercentOfProductNet)}
            />
            <Kpi
              label="GM2"
              value={sek(b.gm2Cents)}
              sub={pct(b.gm2PercentOfProductNet)}
            />
            <Kpi
              label="GM3"
              value={sek(b.gm3Cents)}
              sub={pct(b.gm3PercentOfProductNet)}
              scenario={b.inboundAllocationKind === "forecast"}
            />
            <Kpi label="OpEx (rörelsekostnader)" value={sek(b.opexAllocatedCents)} />
            <Kpi
              label="Rörelseresultat"
              value={sek(b.operatingContributionCents)}
              sub={
                b.coveragePercent != null
                  ? `Täckning ${b.coveragePercent}%`
                  : undefined
              }
            />
          </div>

          {(b.warnings.length > 0 || data?.shippingAudit.affectedItems) ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm space-y-1">
              <div className="font-medium text-amber-900 dark:text-amber-200">
                Datakompletthet
              </div>
              <p className="text-amber-800/90 dark:text-amber-200/80">
                Känd ekonomi: {b.bottlesKnown} / {b.bottles} flaskor (
                {pct(b.coveragePercent)}). Status: {completenessSv(b.completeness)}.
              </p>
              {data?.shippingAudit ? (
                <p className="text-amber-800/90 dark:text-amber-200/80">
                  Fraktgranskning: {data.shippingAudit.affectedItems} rader (
                  {data.shippingAudit.affectedBottles} flaskor) med frakt=0
                  och utgående&gt;0 — rekonstruerbara{" "}
                  {data.shippingAudit.reconstructableItems}, ej{" "}
                  {data.shippingAudit.nonReconstructableItems}. Ingen
                  backfill körd.
                </p>
              ) : null}
              {b.warnings.slice(0, 6).map((w) => (
                <p
                  key={w.code + w.message}
                  className="text-xs text-amber-800 dark:text-amber-300"
                >
                  [{w.code}] {w.message}
                </p>
              ))}
            </div>
          ) : null}

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Översikt</TabsTrigger>
              <TabsTrigger value="wines">Viner</TabsTrigger>
              <TabsTrigger value="opex">OpEx</TabsTrigger>
              <TabsTrigger value="breakeven">Nollpunkt</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 max-w-xl">
                <h3 className="text-sm font-medium mb-3">
                  Marginalbrygga (utfall)
                </h3>
                <WaterfallRow
                  label="Netto produktintäkter"
                  cents={b.productNetRevenueCents}
                  denom={denom}
                  bold
                />
                <WaterfallRow
                  label="− Inköpskostnad vin"
                  cents={-b.producerPurchaseCostCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Alkoholskatt"
                  cents={-b.alcoholExciseCents}
                  denom={denom}
                />
                <WaterfallRow label="= GM1" cents={b.gm1Cents} denom={denom} bold />
                <WaterfallRow
                  label="+ Fraktintäkt netto"
                  cents={b.shippingNetRevenueCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Betalningsavgifter"
                  cents={-b.paymentFeesCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Utgående frakt"
                  cents={-b.outboundCarrierCostCents}
                  denom={denom}
                />
                <WaterfallRow
                  label={
                    b.inboundAllocationKind === "actual"
                      ? "− Inkommande frakt (hel pall)"
                      : b.inboundAllocationKind === "forecast"
                        ? "− Inkommande frakt (prognos)"
                        : "− Inkommande frakt"
                  }
                  cents={-b.inboundFreightCents}
                  denom={denom}
                />
                <WaterfallRow label="− Producentansvar (EPR)" cents={-b.eprCents} denom={denom} />
                <WaterfallRow
                  label="− Reserv retur/svinn"
                  cents={-b.refundBreakageReserveCents}
                  denom={denom}
                />
                <WaterfallRow label="= GM2" cents={b.gm2Cents} denom={denom} bold />
                <WaterfallRow
                  label="− OpEx"
                  cents={-b.opexAllocatedCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="= Rörelseresultat"
                  cents={b.operatingContributionCents}
                  denom={denom}
                  bold
                />
                <p className="mt-3 text-xs text-gray-500">
                  Utgående frakt skalar med beställda flaskor. Inkommande är
                  hela pallkostnaden för pallar i perioden
                  {b.bottlesKnown
                    ? ` · utgående ${sek(Math.round(b.outboundCarrierCostCents / b.bottlesKnown))}/känd flaska`
                    : ""}
                  .
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Netto bidrag kundfrakt:{" "}
                  {sek(b.shippingNetRevenueCents - b.outboundCarrierCostCents)}{" "}
                  (fraktintäkt netto − utgående).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="wines" className="mt-4">
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1F1F23]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-900/50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="p-2">Vin-ID</th>
                      <th className="p-2">Flaskor</th>
                      <th className="p-2">Nettointäkt</th>
                      <th className="p-2">GM1</th>
                      <th className="p-2">GM2</th>
                      <th className="p-2">GM1/flaska</th>
                      <th className="p-2">GM2/flaska</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wineSorted.slice(0, 100).map((w) => (
                      <tr
                        key={w.wineId}
                        className="border-t border-gray-100 dark:border-zinc-800"
                      >
                        <td className="p-2 font-mono text-xs">{w.wineId.slice(0, 8)}…</td>
                        <td className="p-2 tabular-nums">{w.bottles}</td>
                        <td className="p-2 tabular-nums">{sek(w.productNetCents)}</td>
                        <td className="p-2 tabular-nums">{sek(w.gm1Cents)}</td>
                        <td className="p-2 tabular-nums">{sek(w.gm2Cents)}</td>
                        <td className="p-2 tabular-nums">
                          {w.bottles
                            ? sek(Math.round(w.gm1Cents / w.bottles))
                            : "—"}
                        </td>
                        <td className="p-2 tabular-nums">
                          {w.bottles
                            ? sek(Math.round(w.gm2Cents / w.bottles))
                            : "—"}
                        </td>
                      </tr>
                    ))}
                    {wineSorted.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-4 text-gray-500 text-center"
                        >
                          Ingen känd PACT-vinekonomi i perioden
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="opex" className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3 max-w-lg">
                <h3 className="text-sm font-medium">Lägg till OpEx-post</h3>
                <p className="text-xs text-gray-500">
                  Börjar tomt — ange bara verkliga kostnader. Ingen påhittad startdata.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Namn"
                    value={opexName}
                    onChange={(e) => setOpexName(e.target.value)}
                  />
                  <Input
                    placeholder="Belopp SEK"
                    value={opexAmount}
                    onChange={(e) => setOpexAmount(e.target.value)}
                  />
                  <Select value={opexCadence} onValueChange={setOpexCadence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Månadsvis</SelectItem>
                      <SelectItem value="annual">Årligen</SelectItem>
                      <SelectItem value="one_off">Engång</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={opexChannel} onValueChange={setOpexChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Delad</SelectItem>
                      <SelectItem value="pact">PACT</SelectItem>
                      <SelectItem value="dirtywine">Dirtywine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => void addOpex()}>
                  Lägg till kostnad
                </Button>
              </div>
              <ul className="space-y-2 text-sm">
                {(data?.opex.entries ?? []).map((e) => (
                  <li
                    key={String(e.id)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2"
                  >
                    <span>
                      {String(e.name)} · {opexChannelSv(String(e.channel))} ·{" "}
                      {opexCadenceSv(String(e.cadence))} ·{" "}
                      {sek(Number(e.amount_cents) || 0)}
                      {!e.active ? " (inaktiv)" : ""}
                    </span>
                    {e.active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void deactivateOpex(String(e.id))}
                      >
                        Inaktivera
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {data?.opex.sharedUnallocatedCents ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Delad ej allokerad: {sek(data.opex.sharedUnallocatedCents)} —
                  sätt PACT-% på delade poster för att allokera.
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="breakeven" className="mt-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 text-sm max-w-md">
                {data?.breakEven.ok ? (
                  <>
                    <p>
                      Flaskor för att täcka OpEx:{" "}
                      <strong>{data.breakEven.bottlesRequired}</strong>
                    </p>
                    {data.breakEven.netRevenueRequiredCents != null ? (
                      <p className="mt-1">
                        Ungefärlig nettointäkt som krävs:{" "}
                        {sek(data.breakEven.netRevenueRequiredCents)}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p>
                    {data?.breakEven && !data.breakEven.ok
                      ? data.breakEven.reason
                      : "—"}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      {mode === "scenarios" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-300/80 dark:border-amber-700/50 bg-amber-50/40 dark:bg-amber-950/20 p-3 text-sm">
            Prisscenarier är hypotetiska. Ingenting här uppdaterar vinpriser,
            reservationer, fraktofferter eller betalningar.
          </div>
          <div className="grid md:grid-cols-3 gap-3 max-w-3xl">
            <div>
              <Label className="text-xs">Nuvarande pris SEK</Label>
              <Input
                type="number"
                value={simPrice}
                onChange={(e) => setSimPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Föreslaget pris SEK</Label>
              <Input
                type="number"
                value={simProposed}
                onChange={(e) => setSimProposed(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Inköpskostnad SEK/flaska</Label>
              <Input
                type="number"
                step="0.01"
                value={simPurchase}
                onChange={(e) => {
                  setSimPurchaseTouched(true);
                  setSimPurchase(Number(e.target.value));
                }}
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {data?.scenarioDefaults?.medianPurchaseCostSek != null &&
                (data.scenarioDefaults.purchaseSampleSize ?? 0) > 0
                  ? `Standard: median från ${data.scenarioDefaults.purchaseSampleSize} live-viner (exkl. alkoholskatt)`
                  : "Standard: median från live-utbud när tillgängligt"}
              </p>
            </div>
            <div>
              <Label className="text-xs">Frakt debiterad / order SEK</Label>
              <Input
                type="number"
                value={simShipOrder}
                onChange={(e) => setSimShipOrder(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Utgående frakt / order SEK</Label>
              <Input
                type="number"
                value={simOutbound}
                onChange={(e) => setSimOutbound(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Inkommande frakt totalt SEK</Label>
              <Input
                type="number"
                value={simInbound}
                onChange={(e) => setSimInbound(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col justify-end gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="sim-excise-half"
                  className="text-xs leading-snug"
                >
                  50 % rabatt på alkoholskatt
                </Label>
                <Switch
                  id="sim-excise-half"
                  checked={simExciseHalfRate}
                  onCheckedChange={setSimExciseHalfRate}
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {simExciseHalfRate
                  ? `Använder ${(simExciseCentsPerBottle / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK/flaska (halv ${DEFAULT_ALCOHOL_TAX_CENTS / 100})`
                  : `Använder ${(DEFAULT_ALCOHOL_TAX_CENTS / 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SEK/flaska (full skatt)`}
              </p>
            </div>
            <div>
              <Label className="text-xs">Antaget ship-antal</Label>
              <Input
                type="number"
                value={simShipQty}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSimShipQty(n);
                  if (!simVolumeTouched && Number.isFinite(n) && n > 0) {
                    setSimVolumeBottles(n);
                  }
                }}
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Delar inkommande frakt per flaska (GM3)
              </p>
            </div>
            <div>
              <Label className="text-xs">Volym flaskor (skalar hela P&amp;L)</Label>
              <Input
                type="number"
                value={simVolumeBottles}
                onChange={(e) => {
                  setSimVolumeTouched(true);
                  setSimVolumeBottles(Number(e.target.value));
                }}
              />
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                Inköp m.m. = kostnad/flaska × denna volym
              </p>
            </div>
          </div>
          <Button onClick={() => void runSimulate()}>Kör simulering</Button>

          {simResult && !("error" in simResult && simResult.error) ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 max-w-4xl">
                <Kpi
                  label="Nuvarande GM1 / flaska"
                  value={sek(
                    Number(
                      (simResult.current as { gm1CentsPerBottle?: number })
                        ?.gm1CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Föreslagen GM1 / flaska"
                  value={sek(
                    Number(
                      (simResult.proposed as { gm1CentsPerBottle?: number })
                        ?.gm1CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Nuvarande GM2 / flaska"
                  value={sek(
                    Number(
                      (simResult.current as { gm2CentsPerBottle?: number })
                        ?.gm2CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Föreslagen GM2 / flaska"
                  value={sek(
                    Number(
                      (simResult.proposed as { gm2CentsPerBottle?: number })
                        ?.gm2CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
                <div className="space-y-4">
                  <ScenarioMarginBridge
                    title={`Marginalbrygga — nuvarande (${simPrice} SEK)`}
                    unit={simResult.current as ScenarioUnit}
                    volumeBottles={
                      Number(
                        (simResult.volumeImpact as { bottles?: number })
                          ?.bottles,
                      ) || simVolumeBottles
                    }
                    opexAllocatedCents={data?.opex.allocatedCents ?? 0}
                  />
                  <ScenarioSideTables
                    title={`Ship-antal · nuvarande (${simPrice} SEK)`}
                    priceTitle={`Δ pris · nuvarande (${simPrice} SEK)`}
                    palletFillTable={
                      (simResult.currentPalletFillTable as Array<
                        Record<string, number>
                      >) || []
                    }
                    sensitivity={
                      (simResult.currentSensitivity as Array<
                        Record<string, number>
                      >) || []
                    }
                  />
                </div>
                <div className="space-y-4">
                  <ScenarioMarginBridge
                    title={`Marginalbrygga — föreslagen (${simProposed} SEK)`}
                    unit={simResult.proposed as ScenarioUnit}
                    volumeBottles={
                      Number(
                        (simResult.volumeImpact as { bottles?: number })
                          ?.bottles,
                      ) || simVolumeBottles
                    }
                    opexAllocatedCents={data?.opex.allocatedCents ?? 0}
                  />
                  <ScenarioSideTables
                    title={`Ship-antal · föreslagen (${simProposed} SEK)`}
                    priceTitle={`Δ pris · föreslagen (${simProposed} SEK)`}
                    palletFillTable={
                      (simResult.proposedPalletFillTable as Array<
                        Record<string, number>
                      >) ||
                      (simResult.palletFillTable as Array<
                        Record<string, number>
                      >) ||
                      []
                    }
                    sensitivity={
                      (simResult.proposedSensitivity as Array<
                        Record<string, number>
                      >) ||
                      (simResult.sensitivity as Array<
                        Record<string, number>
                      >) ||
                      []
                    }
                  />
                </div>
              </div>

              {simResult.marginHeatmap &&
              typeof simResult.marginHeatmap === "object" &&
              Array.isArray(
                (simResult.marginHeatmap as { prices?: unknown }).prices,
              ) ? (
                <MarginHeatmap
                  heatmap={
                    simResult.marginHeatmap as {
                      prices: number[];
                      shipQtys: number[];
                      cells: Array<{
                        price: number;
                        shipQty: number;
                        gm1CentsPerBottle?: number;
                        gm1Percent?: number | null;
                        gm2CentsPerBottle: number;
                        gm2Percent: number | null;
                        gm3CentsPerBottle?: number;
                        gm3Percent?: number | null;
                      }>;
                    }
                  }
                  currentPrice={simPrice}
                  proposedPrice={simProposed}
                  currentShipQty={simShipQty}
                  volumeBottles={
                    Number(
                      (simResult.volumeImpact as { bottles?: number })
                        ?.bottles,
                    ) || simVolumeBottles
                  }
                  opexAllocatedCents={data?.opex.allocatedCents ?? 0}
                  onApplyScenario={applyHeatmapSelection}
                  scenarioAssumptions={{
                    priceIncludesVat: channel !== "dirtywine",
                    vatRate: 0.25,
                    bottlesPerOrder: 6,
                    eprCentsPerBottle: 50,
                    refundBreakageReserveRate: 0.01,
                    stripeFeePercent: channel === "dirtywine" ? 0 : 0.015,
                    stripeFeeFixedCentsPerOrder:
                      channel === "dirtywine" ? 0 : 180,
                    shippingRevenueGrossCentsPerOrder: Math.round(
                      simShipOrder * 100,
                    ),
                    shippingPriceIncludesVat: channel !== "dirtywine",
                    outboundCarrierCostCentsPerOrder: Math.round(
                      simOutbound * 100,
                    ),
                    inboundFreightTotalCents: Math.round(simInbound * 100),
                    exciseRateMultiplier: simExciseHalfRate ? 0.5 : 1,
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
