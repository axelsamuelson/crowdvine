"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        {scenario ? " · scenario" : ""}
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
  const [simShipOrder, setSimShipOrder] = useState(100);
  const [simOutbound, setSimOutbound] = useState(69);
  const [simInbound, setSimInbound] = useState(4262.63);
  const [simShipQty, setSimShipQty] = useState(240);
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
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [channel, period, forecastShipQty]);

  useEffect(() => {
    void load();
  }, [load]);

  const b = data?.breakdown;
  const denom = b?.productNetRevenueCents ?? 0;

  const runSimulate = async () => {
    const input = {
      sellingPriceMajor: simPrice,
      priceIncludesVat: channel !== "dirtywine",
      vatRate: 0.25,
      bottles: 100,
      bottlesPerOrder: 6,
      purchaseCostCentsPerBottle: Math.round(simPurchase * 100),
      purchaseCostCurrency: "SEK",
      purchaseFxRate: 1,
      exciseCentsPerBottle: 2219,
      eprCentsPerBottle: 50,
      refundBreakageReserveRate: 0.01,
      stripeFeePercent: channel === "dirtywine" ? 0 : 0.015,
      stripeFeeFixedCentsPerOrder: channel === "dirtywine" ? 0 : 180,
      shippingRevenueGrossCentsPerOrder: Math.round(simShipOrder * 100),
      shippingPriceIncludesVat: channel !== "dirtywine",
      outboundCarrierCostCentsPerOrder: Math.round(simOutbound * 100),
      inboundFreightTotalCents: Math.round(simInbound * 100),
      assumedShipQuantity: simShipQty,
    };
    const res = await fetch("/api/admin/finance/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "scenario",
        input,
        proposed: { sellingPriceMajor: simProposed },
        volumeBottles: 100,
      }),
    });
    setSimResult(await res.json());
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
          "Management economics — not statutory accounting."}
      </p>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Channel</Label>
          <Select value={channel} onValueChange={(v) => setParam("channel", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
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
              <SelectItem value="this_month">This month</SelectItem>
              <SelectItem value="last_month">Last month</SelectItem>
              <SelectItem value="last_30">Last 30 days</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="ytd">YTD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Mode</Label>
          <Select value={mode} onValueChange={(v) => setParam("mode", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="actuals">Actuals</SelectItem>
              <SelectItem value="scenarios">Pricing scenarios</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {channel !== "dirtywine" ? (
          <div className="space-y-1">
            <Label className="text-xs">Forecast ship qty (GM3)</Label>
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
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading finance…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {mode === "actuals" && b ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Kpi
              label="Net product revenue"
              value={sek(b.productNetRevenueCents)}
              sub={`${b.orders} orders · ${b.bottles} bottles`}
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
              label={
                b.inboundAllocationKind === "forecast"
                  ? "Forecast GM3"
                  : "GM3"
              }
              value={sek(b.gm3Cents)}
              sub={pct(b.gm3PercentOfProductNet)}
              scenario={b.inboundAllocationKind === "forecast"}
            />
            <Kpi label="OpEx" value={sek(b.opexAllocatedCents)} />
            <Kpi
              label="Operating result"
              value={sek(b.operatingContributionCents)}
              sub={
                b.coveragePercent != null
                  ? `Coverage ${b.coveragePercent}%`
                  : undefined
              }
            />
          </div>

          {(b.warnings.length > 0 || data?.shippingAudit.affectedItems) ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-sm space-y-1">
              <div className="font-medium text-amber-900 dark:text-amber-200">
                Data completeness
              </div>
              <p className="text-amber-800/90 dark:text-amber-200/80">
                Known economics: {b.bottlesKnown} / {b.bottles} bottles (
                {pct(b.coveragePercent)}). Status: {b.completeness}.
              </p>
              {data?.shippingAudit ? (
                <p className="text-amber-800/90 dark:text-amber-200/80">
                  Shipping audit: {data.shippingAudit.affectedItems} items (
                  {data.shippingAudit.affectedBottles} bottles) with shipping=0
                  and outbound&gt;0 — reconstructable{" "}
                  {data.shippingAudit.reconstructableItems}, not{" "}
                  {data.shippingAudit.nonReconstructableItems}. No backfill
                  executed.
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
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wines">Wines</TabsTrigger>
              <TabsTrigger value="opex">OpEx</TabsTrigger>
              <TabsTrigger value="breakeven">Break-even</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 max-w-xl">
                <h3 className="text-sm font-medium mb-3">
                  Margin bridge (actuals)
                </h3>
                <WaterfallRow
                  label="Net product revenue"
                  cents={b.productNetRevenueCents}
                  denom={denom}
                  bold
                />
                <WaterfallRow
                  label="− Producer COGS"
                  cents={-b.producerPurchaseCostCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Excise"
                  cents={-b.alcoholExciseCents}
                  denom={denom}
                />
                <WaterfallRow label="= GM1" cents={b.gm1Cents} denom={denom} bold />
                <WaterfallRow
                  label="+ Shipping revenue net"
                  cents={b.shippingNetRevenueCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Payment fees"
                  cents={-b.paymentFeesCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="− Outbound carrier"
                  cents={-b.outboundCarrierCostCents}
                  denom={denom}
                />
                <WaterfallRow label="− EPR" cents={-b.eprCents} denom={denom} />
                <WaterfallRow
                  label="− Refund reserve"
                  cents={-b.refundBreakageReserveCents}
                  denom={denom}
                />
                <WaterfallRow label="= GM2" cents={b.gm2Cents} denom={denom} bold />
                <WaterfallRow
                  label={
                    b.inboundAllocationKind === "forecast"
                      ? "− Inbound freight (forecast)"
                      : "− Inbound freight"
                  }
                  cents={-b.inboundFreightCents}
                  denom={denom}
                />
                <WaterfallRow label="= GM3" cents={b.gm3Cents} denom={denom} bold />
                <WaterfallRow
                  label="− OpEx"
                  cents={-b.opexAllocatedCents}
                  denom={denom}
                />
                <WaterfallRow
                  label="= Operating result"
                  cents={b.operatingContributionCents}
                  denom={denom}
                  bold
                />
                <p className="mt-3 text-xs text-gray-500">
                  Net outbound contribution:{" "}
                  {sek(b.shippingNetRevenueCents - b.outboundCarrierCostCents)}{" "}
                  (shipping net − outbound).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="wines" className="mt-4">
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1F1F23]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-zinc-900/50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="p-2">Wine ID</th>
                      <th className="p-2">Bottles</th>
                      <th className="p-2">Net rev</th>
                      <th className="p-2">GM1</th>
                      <th className="p-2">GM2</th>
                      <th className="p-2">GM1/btl</th>
                      <th className="p-2">GM2/btl</th>
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
                          No known PACT wine economics in period
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="opex" className="mt-4 space-y-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 space-y-3 max-w-lg">
                <h3 className="text-sm font-medium">Add OpEx entry</h3>
                <p className="text-xs text-gray-500">
                  Starts empty — enter real costs only. No invented seed data.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Name"
                    value={opexName}
                    onChange={(e) => setOpexName(e.target.value)}
                  />
                  <Input
                    placeholder="Amount SEK"
                    value={opexAmount}
                    onChange={(e) => setOpexAmount(e.target.value)}
                  />
                  <Select value={opexCadence} onValueChange={setOpexCadence}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="one_off">One-off</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={opexChannel} onValueChange={setOpexChannel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Shared</SelectItem>
                      <SelectItem value="pact">PACT</SelectItem>
                      <SelectItem value="dirtywine">Dirtywine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => void addOpex()}>
                  Add expense
                </Button>
              </div>
              <ul className="space-y-2 text-sm">
                {(data?.opex.entries ?? []).map((e) => (
                  <li
                    key={String(e.id)}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-zinc-800 px-3 py-2"
                  >
                    <span>
                      {String(e.name)} · {String(e.channel)} ·{" "}
                      {String(e.cadence)} ·{" "}
                      {sek(Number(e.amount_cents) || 0)}
                      {!e.active ? " (inactive)" : ""}
                    </span>
                    {e.active ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void deactivateOpex(String(e.id))}
                      >
                        Deactivate
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {data?.opex.sharedUnallocatedCents ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Shared unallocated: {sek(data.opex.sharedUnallocatedCents)} —
                  set PACT % on shared entries to allocate.
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="breakeven" className="mt-4">
              <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 text-sm max-w-md">
                {data?.breakEven.ok ? (
                  <>
                    <p>
                      Bottles to cover OpEx:{" "}
                      <strong>{data.breakEven.bottlesRequired}</strong>
                    </p>
                    {data.breakEven.netRevenueRequiredCents != null ? (
                      <p className="mt-1">
                        Approx. net revenue required:{" "}
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
            Pricing scenarios are hypothetical. Nothing here updates wine
            prices, reservations, freight quotes, or payments.
          </div>
          <div className="grid md:grid-cols-3 gap-3 max-w-3xl">
            <div>
              <Label className="text-xs">Current price SEK</Label>
              <Input
                type="number"
                value={simPrice}
                onChange={(e) => setSimPrice(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Proposed price SEK</Label>
              <Input
                type="number"
                value={simProposed}
                onChange={(e) => setSimProposed(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Purchase cost SEK/btl</Label>
              <Input
                type="number"
                value={simPurchase}
                onChange={(e) => setSimPurchase(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Shipping charged / order SEK</Label>
              <Input
                type="number"
                value={simShipOrder}
                onChange={(e) => setSimShipOrder(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Outbound / order SEK</Label>
              <Input
                type="number"
                value={simOutbound}
                onChange={(e) => setSimOutbound(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Inbound freight total SEK</Label>
              <Input
                type="number"
                value={simInbound}
                onChange={(e) => setSimInbound(Number(e.target.value))}
              />
            </div>
            <div>
              <Label className="text-xs">Assumed ship qty</Label>
              <Input
                type="number"
                value={simShipQty}
                onChange={(e) => setSimShipQty(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={() => void runSimulate()}>Run simulation</Button>

          {simResult && !("error" in simResult && simResult.error) ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3 max-w-2xl">
                <Kpi
                  label="Current GM2 / btl"
                  value={sek(
                    Number(
                      (simResult.current as { gm2CentsPerBottle?: number })
                        ?.gm2CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Proposed GM2 / btl"
                  value={sek(
                    Number(
                      (simResult.proposed as { gm2CentsPerBottle?: number })
                        ?.gm2CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Current GM3 / btl"
                  value={sek(
                    Number(
                      (simResult.current as { gm3CentsPerBottle?: number })
                        ?.gm3CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
                <Kpi
                  label="Proposed GM3 / btl"
                  value={sek(
                    Number(
                      (simResult.proposed as { gm3CentsPerBottle?: number })
                        ?.gm3CentsPerBottle,
                    ) || 0,
                  )}
                  scenario
                />
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1F1F23] max-w-2xl">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40">
                    <tr>
                      <th className="p-2 text-left">Ship qty</th>
                      <th className="p-2 text-left">Inbound/btl</th>
                      <th className="p-2 text-left">GM3/btl</th>
                      <th className="p-2 text-left">GM3%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (simResult.palletFillTable as Array<Record<string, number>>) ||
                      []
                    ).map((row) => (
                      <tr
                        key={row.shipQty}
                        className="border-t border-gray-100 dark:border-zinc-800"
                      >
                        <td className="p-2">{row.shipQty}</td>
                        <td className="p-2">{sek(row.inboundPerBottleCents)}</td>
                        <td className="p-2">{sek(row.gm3PerBottleCents)}</td>
                        <td className="p-2">{pct(row.gm3Percent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-[#1F1F23] max-w-2xl">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-zinc-900/40">
                    <tr>
                      <th className="p-2 text-left">Δ price</th>
                      <th className="p-2 text-left">GM1%</th>
                      <th className="p-2 text-left">GM2%</th>
                      <th className="p-2 text-left">GM3%</th>
                      <th className="p-2 text-left">GM3 SEK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(
                      (simResult.sensitivity as Array<Record<string, number>>) ||
                      []
                    ).map((row) => (
                      <tr
                        key={row.priceDeltaSek}
                        className="border-t border-gray-100 dark:border-zinc-800"
                      >
                        <td className="p-2">
                          {row.priceDeltaSek >= 0 ? "+" : ""}
                          {row.priceDeltaSek} → {row.sellingPriceMajor}
                        </td>
                        <td className="p-2">{pct(row.gm1Percent)}</td>
                        <td className="p-2">{pct(row.gm2Percent)}</td>
                        <td className="p-2">{pct(row.gm3Percent)}</td>
                        <td className="p-2">{sek(row.gm3CentsPerBottle)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
