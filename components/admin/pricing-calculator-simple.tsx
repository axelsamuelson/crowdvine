"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Calculator, ChevronDown } from "lucide-react";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";
import {
  buildRetailPriceBreakdown,
  DEFAULT_ALCOHOL_TAX_CENTS,
  implyMarginPercentageFromRetailPrice,
  resolveSekExchangeRateSync,
} from "@/lib/wine-retail-pricing";
import { calculateUnitScenario } from "@/lib/finance/margins";
import {
  defaultFinanceFulfillmentCosts,
  type FinanceFulfillmentCosts,
} from "@/lib/finance/fulfillment-costs";

interface PricingData {
  cost_currency: string;
  cost_amount: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  calculated_price_cents: number;
  alcohol_tax_cents?: number | null;
  exchange_rate?: number | null;
}

interface PricingCalculatorProps {
  pricingData: PricingData;
  onPricingChange: (data: PricingData) => void;
  /** When false, hide margin input; producer only sets cost, margin is fixed by platform */
  showMargin?: boolean;
  /** Render without outer Card (e.g. inside AdminFormSection) */
  embedded?: boolean;
}

const DEFAULT_PRODUCER_MARGIN = 10;

export function PricingCalculator({
  pricingData,
  onPricingChange,
  showMargin = true,
  embedded = false,
}: PricingCalculatorProps) {
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [rateReady, setRateReady] = useState(
    pricingData.cost_currency === "SEK",
  );
  const [showDetails, setShowDetails] = useState(false);
  const [showGm2Breakdown, setShowGm2Breakdown] = useState(false);
  const [showProfitBreakdown, setShowProfitBreakdown] = useState(false);
  const [finalPriceDraft, setFinalPriceDraft] = useState(
    ((pricingData.calculated_price_cents || 0) / 100).toFixed(2),
  );
  const [finalPriceError, setFinalPriceError] = useState<string | null>(null);
  const [editingFinalPrice, setEditingFinalPrice] = useState(false);
  const [fulfillment, setFulfillment] = useState<FinanceFulfillmentCosts>(
    defaultFinanceFulfillmentCosts(),
  );

  const currencies = [
    { code: "EUR", name: "Euro (EUR)" },
    { code: "USD", name: "US Dollar (USD)" },
    { code: "GBP", name: "British Pound (GBP)" },
    { code: "SEK", name: "Swedish Krona (SEK)" },
  ];

  const effectiveMargin = showMargin
    ? pricingData.margin_percentage
    : DEFAULT_PRODUCER_MARGIN;

  const updatePricingData = (field: keyof PricingData, value: unknown) => {
    if (!showMargin && field === "margin_percentage") return;
    onPricingChange({
      ...pricingData,
      [field]: value,
      ...(!showMargin && { margin_percentage: DEFAULT_PRODUCER_MARGIN }),
    });
  };

  const fetchCurrentRate = async (currency: string) => {
    if (currency === "SEK") {
      setCurrentRate(1);
      setRateReady(true);
      return;
    }

    setLoadingRate(true);
    setRateReady(false);
    try {
      const response = await fetch(
        `/api/exchange-rates?from=${currency}&to=SEK`,
      );
      const data = await response.json();
      const rate = Number(data?.rate);
      if (Number.isFinite(rate) && rate > 0) {
        setCurrentRate(rate);
      } else {
        setCurrentRate(resolveSekExchangeRateSync(currency));
      }
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
      setCurrentRate(resolveSekExchangeRateSync(currency));
    } finally {
      setLoadingRate(false);
      setRateReady(true);
    }
  };

  useEffect(() => {
    if (pricingData.cost_currency) {
      fetchCurrentRate(pricingData.cost_currency);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricingData.cost_currency]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/finance/fulfillment-costs");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json?.costs) return;
        setFulfillment(json.costs as FinanceFulfillmentCosts);
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const exchangeRate = useMemo(() => {
    if (pricingData.cost_currency === "SEK") return 1;
    if (currentRate && currentRate > 0) return currentRate;
    return resolveSekExchangeRateSync(
      pricingData.cost_currency,
      pricingData.exchange_rate,
    );
  }, [
    pricingData.cost_currency,
    pricingData.exchange_rate,
    currentRate,
  ]);

  const breakdown = useMemo(() => {
    const retail = buildRetailPriceBreakdown({
      costAmount: pricingData.cost_amount || 0,
      exchangeRate,
      priceIncludesVat: pricingData.price_includes_vat !== false,
      marginPercentage: effectiveMargin || 0,
      alcoholTaxCents:
        pricingData.alcohol_tax_cents ?? DEFAULT_ALCOHOL_TAX_CENTS,
    });

    const sbPrice = calculateSystembolagetPrice(
      pricingData.cost_amount || 0,
      exchangeRate,
      DEFAULT_ALCOHOL_TAX_CENTS,
    );

    return { ...retail, sbPrice };
  }, [
    pricingData.cost_amount,
    pricingData.alcohol_tax_cents,
    pricingData.price_includes_vat,
    effectiveMargin,
    exchangeRate,
  ]);

  const unitEconomics = useMemo(() => {
    const purchaseCostCentsPerBottle = Math.round(
      breakdown.costAmountInSek * 100,
    );
    const sellingPriceMajor = breakdown.finalPriceCents / 100;
    return calculateUnitScenario({
      sellingPriceMajor,
      priceIncludesVat: pricingData.price_includes_vat !== false,
      vatRate: fulfillment.vatRate,
      bottles: 1,
      bottlesPerOrder: fulfillment.bottlesPerOrder,
      purchaseCostCentsPerBottle,
      purchaseCostCurrency: "SEK",
      purchaseFxRate: 1,
      exciseCentsPerBottle:
        pricingData.alcohol_tax_cents ?? DEFAULT_ALCOHOL_TAX_CENTS,
      eprCentsPerBottle: fulfillment.eprCentsPerBottle,
      refundBreakageReserveRate: fulfillment.refundBreakageReserveRate,
      stripeFeePercent: fulfillment.stripeFeePercent,
      stripeFeeFixedCentsPerOrder: fulfillment.stripeFeeFixedCentsPerOrder,
      shippingRevenueGrossCentsPerOrder:
        fulfillment.shippingRevenueGrossCentsPerOrder,
      shippingPriceIncludesVat: fulfillment.shippingPriceIncludesVat,
      outboundCarrierCostCentsPerOrder:
        fulfillment.outboundCarrierCostCentsPerOrder,
      inboundFreightTotalCents: fulfillment.inboundFreightTotalCents,
      assumedShipQuantity: fulfillment.assumedShipQuantity,
    });
  }, [
    breakdown.costAmountInSek,
    breakdown.finalPriceCents,
    pricingData.price_includes_vat,
    pricingData.alcohol_tax_cents,
    fulfillment,
  ]);

  const sekFromOre = (ore: number) => (ore / 100).toFixed(2);

  /** Net fulfillment impact per bottle: ship revenue − all GM2 cost lines. */
  const gm2NetCostCentsPerBottle =
    unitEconomics.outboundCentsPerBottle +
    unitEconomics.inboundCentsPerBottle +
    unitEconomics.paymentFeeCentsPerBottle +
    unitEconomics.eprCentsPerBottle +
    unitEconomics.refundReserveCentsPerBottle -
    unitEconomics.shippingNetCentsPerBottle;

  // Keep parent in sync with computed final price + FX used (avoid infinite loops)
  useEffect(() => {
    if (!breakdown.isValid || !rateReady) return;
    if (
      pricingData.calculated_price_cents === breakdown.finalPriceCents &&
      pricingData.exchange_rate === breakdown.exchangeRate
    ) {
      return;
    }
    onPricingChange({
      ...pricingData,
      calculated_price_cents: breakdown.finalPriceCents,
      exchange_rate: breakdown.exchangeRate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    breakdown.finalPriceCents,
    breakdown.exchangeRate,
    breakdown.isValid,
    rateReady,
  ]);

  // Mirror computed slutpris into the editable field unless the user is typing
  useEffect(() => {
    if (editingFinalPrice) return;
    setFinalPriceDraft((breakdown.finalPriceCents / 100).toFixed(2));
    setFinalPriceError(null);
  }, [breakdown.finalPriceCents, editingFinalPrice]);

  const applyFinalPrice = (raw: string) => {
    if (!showMargin) return;

    const normalized = raw.trim().replace(",", ".");
    const sek = Number(normalized);
    if (!Number.isFinite(sek) || sek <= 0) {
      setFinalPriceError("Ange ett giltigt slutpris över 0 SEK.");
      setFinalPriceDraft((breakdown.finalPriceCents / 100).toFixed(2));
      return;
    }

    const retailPriceCents = Math.round(sek * 100);
    const implied = implyMarginPercentageFromRetailPrice({
      retailPriceCents,
      costAmount: pricingData.cost_amount || 0,
      exchangeRate,
      priceIncludesVat: pricingData.price_includes_vat !== false,
      alcoholTaxCents:
        pricingData.alcohol_tax_cents ?? DEFAULT_ALCOHOL_TAX_CENTS,
    });

    if (implied == null) {
      setFinalPriceError(
        "Slutpriset måste vara högre än kostnad + alkoholskatt (exkl. moms).",
      );
      setFinalPriceDraft((breakdown.finalPriceCents / 100).toFixed(2));
      return;
    }

    setFinalPriceError(null);
    // Keep the exact öre the user typed (do not re-display a drifted recalculation).
    setFinalPriceDraft((retailPriceCents / 100).toFixed(2));
    onPricingChange({
      ...pricingData,
      margin_percentage: implied,
      calculated_price_cents: retailPriceCents,
      exchange_rate: exchangeRate,
    });
  };

  const formBody = (
    <>
        {/* Inputs */}
        <div className="grid grid-cols-1 gap-3">
          <div className="w-fit space-y-2">
            <Label htmlFor="cost_currency">Kostnadsvaluta</Label>
            <Select
              value={pricingData.cost_currency}
              onValueChange={(value) => {
                updatePricingData("cost_currency", value);
                fetchCurrentRate(value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_amount">Kostnad per flaska</Label>
            <Input
              id="cost_amount"
              type="number"
              step="0.01"
              className="no-spinner"
              value={pricingData.cost_amount}
              onChange={(e) =>
                updatePricingData(
                  "cost_amount",
                  parseFloat(e.target.value) || 0,
                )
              }
              placeholder="7.00"
            />
          </div>

          {showMargin && (
            <div className="space-y-2">
              <Label htmlFor="margin_percentage">Marginal %</Label>
              <Input
                id="margin_percentage"
                type="number"
                step="0.1"
                className="no-spinner"
                value={pricingData.margin_percentage}
                onChange={(e) =>
                  updatePricingData(
                    "margin_percentage",
                    parseFloat(e.target.value) || 0,
                  )
                }
                placeholder="10.0"
              />
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <Label
                htmlFor="final_price_sek"
                className="text-sm text-gray-500 dark:text-zinc-400"
              >
                Slutpris (ink. moms) — sparas till PDP
              </Label>
              {showMargin ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="final_price_sek"
                    type="number"
                    step="0.01"
                    min={0}
                    className="no-spinner max-w-[10rem] text-2xl font-semibold h-12"
                    value={finalPriceDraft}
                    onFocus={() => setEditingFinalPrice(true)}
                    onChange={(e) => {
                      setFinalPriceDraft(e.target.value);
                      setFinalPriceError(null);
                    }}
                    onBlur={() => {
                      setEditingFinalPrice(false);
                      applyFinalPrice(finalPriceDraft);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <span className="text-sm font-medium text-zinc-400">SEK</span>
                </div>
              ) : (
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {(breakdown.finalPriceCents / 100).toFixed(2)} SEK
                </div>
              )}
              {showMargin && (
                <p className="text-xs text-zinc-400">
                  Ändra slutpriset så räknas marginalen om automatiskt.
                </p>
              )}
              {finalPriceError && (
                <div className="text-sm text-red-600">{finalPriceError}</div>
              )}
              {!breakdown.isValid && (
                <div className="mt-1 text-sm text-red-600">
                  Marginalen måste vara under 100%.
                </div>
              )}
              {loadingRate && (
                <div className="mt-1 text-xs text-zinc-400">
                  Hämtar växelkurs…
                </div>
              )}
            </div>
            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    1. Flaskkostnad
                  </p>
                  <span className="font-medium text-rose-700 dark:text-rose-300">
                    {breakdown.costInSek.toFixed(2)} SEK
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-0.5">
                  <span className="text-rose-600/90 dark:text-rose-400/90">
                    Vinkostnad
                  </span>
                  <span className="text-right font-medium text-rose-700 dark:text-rose-300">
                    {breakdown.costAmountInSek.toFixed(2)} SEK
                  </span>
                  <span className="text-amber-600/90 dark:text-amber-400/90">
                    Alkoholskatt
                  </span>
                  <span className="text-right font-medium text-amber-700 dark:text-amber-300">
                    {breakdown.alcoholTaxInSek.toFixed(2)} SEK
                  </span>
                </div>
              </div>

              <Collapsible
                open={showGm2Breakdown}
                onOpenChange={setShowGm2Breakdown}
                className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    2. GP2-kostnader / flaska
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={
                        gm2NetCostCentsPerBottle <= 0
                          ? "font-medium text-emerald-700 dark:text-emerald-300"
                          : "font-medium text-rose-700 dark:text-rose-300"
                      }
                    >
                      {gm2NetCostCentsPerBottle > 0 ? "−" : "+"}
                      {sekFromOre(Math.abs(gm2NetCostCentsPerBottle))} SEK
                    </span>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                      >
                        {showGm2Breakdown ? "Dölj" : "Visa"} detaljer
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            showGm2Breakdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="mt-1.5 space-y-2">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-0.5">
                      <span className="text-emerald-600/90 dark:text-emerald-400/90">
                        Kundfrakt (netto)
                      </span>
                      <span className="text-right font-medium text-emerald-700 dark:text-emerald-300">
                        +{sekFromOre(unitEconomics.shippingNetCentsPerBottle)}{" "}
                        SEK
                      </span>
                      <span className="text-rose-600/90 dark:text-rose-400/90">
                        Utgående frakt
                      </span>
                      <span className="text-right font-medium text-rose-700 dark:text-rose-300">
                        −{sekFromOre(unitEconomics.outboundCentsPerBottle)} SEK
                      </span>
                      <span className="text-rose-600/90 dark:text-rose-400/90">
                        Inkommande frakt
                      </span>
                      <span className="text-right font-medium text-rose-700 dark:text-rose-300">
                        −{sekFromOre(unitEconomics.inboundCentsPerBottle)} SEK
                      </span>
                      <span className="text-amber-600/90 dark:text-amber-400/90">
                        Transaktionsavgift
                      </span>
                      <span className="text-right font-medium text-amber-700 dark:text-amber-300">
                        −{sekFromOre(unitEconomics.paymentFeeCentsPerBottle)} SEK
                      </span>
                      <span className="text-amber-600/90 dark:text-amber-400/90">
                        EPR
                      </span>
                      <span className="text-right font-medium text-amber-700 dark:text-amber-300">
                        −{sekFromOre(unitEconomics.eprCentsPerBottle)} SEK
                      </span>
                      <span className="text-amber-600/90 dark:text-amber-400/90">
                        Retur/svinn-reserv
                      </span>
                      <span className="text-right font-medium text-amber-700 dark:text-amber-300">
                        −{sekFromOre(unitEconomics.refundReserveCentsPerBottle)}{" "}
                        SEK
                      </span>
                    </div>
                    <Link
                      href="/admin/finance/fulfillment-costs"
                      className="inline-block text-[11px] text-white underline-offset-2 hover:underline"
                    >
                      Redigera i Finans → Fulfillment costs
                    </Link>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-zinc-700">
                <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  3. Pris / flaska
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-0.5">
                  <span className="text-zinc-400">Pris exkl. moms</span>
                  <span className="text-right font-medium text-zinc-100">
                    {breakdown.priceExVat.toFixed(2)} SEK
                  </span>
                  <span className="text-amber-600/90 dark:text-amber-400/90">
                    Moms ({(breakdown.vatRate * 100).toFixed(0)}%)
                  </span>
                  <span className="text-right font-medium text-amber-700 dark:text-amber-300">
                    {breakdown.vatAmountSek.toFixed(2)} SEK
                  </span>
                </div>
              </div>

              <Collapsible
                open={showProfitBreakdown}
                onOpenChange={setShowProfitBreakdown}
                className="space-y-1.5 border-t border-gray-200 pt-3 dark:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    4. Vinst / flaska
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      GP2 {sekFromOre(unitEconomics.gm2CentsPerBottle)} SEK
                    </span>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                      >
                        {showProfitBreakdown ? "Dölj" : "Visa"} detaljer
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${
                            showProfitBreakdown ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 pl-0.5">
                    <span className="text-emerald-600/90 dark:text-emerald-400/90">
                      GP1 (efter flaskkostnad)
                    </span>
                    <span className="text-right font-medium text-emerald-700 dark:text-emerald-300">
                      {sekFromOre(unitEconomics.gm1CentsPerBottle)} SEK
                    </span>
                    <span className="text-emerald-600/90 dark:text-emerald-400/90">
                      GP2 (efter fulfillment)
                    </span>
                    <span className="text-right font-medium text-emerald-700 dark:text-emerald-300">
                      {sekFromOre(unitEconomics.gm2CentsPerBottle)} SEK
                    </span>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>

        <Separator className="bg-gray-200 dark:bg-zinc-800" />

        {/* Details */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-zinc-400">
              Växelkurs, skatter och referenspriser
            </div>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-gray-200 text-xs text-gray-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Detaljer
                <ChevronDown
                  className={`ml-2 h-4 w-4 transition-transform ${
                    showDetails ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="mt-4">
            <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
              {pricingData.cost_currency !== "SEK" && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">
                    Växelkurs
                  </span>
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    1 {pricingData.cost_currency} ={" "}
                    {breakdown.exchangeRate.toFixed(4)} SEK{" "}
                    {loadingRate ? (
                      <span className="text-gray-400">(uppdaterar)</span>
                    ) : null}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-rose-600/90 dark:text-rose-400/90">
                  Vinkostnad (SEK)
                </span>
                <span className="font-medium text-rose-700 dark:text-rose-300">
                  {breakdown.costAmountInSek.toFixed(2)} SEK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-amber-600/90 dark:text-amber-400/90">
                  Alkoholskatt
                </span>
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  {breakdown.alcoholTaxInSek.toFixed(2)} SEK
                </span>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">
                  Pris exkl. moms
                </span>
                <span className="font-medium text-gray-900 dark:text-zinc-100">
                  {breakdown.priceExVat.toFixed(2)} SEK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-600/90 dark:text-emerald-400/90">
                  Nettovinst (exkl. moms)
                </span>
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  {breakdown.netProfitSek.toFixed(2)} SEK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">
                  Systembolaget (referens)
                </span>
                <Badge variant="secondary">
                  {Number(breakdown.sbPrice).toFixed(2)} SEK
                </Badge>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
    </>
  );

  if (embedded) {
    return <div className="space-y-6">{formBody}</div>;
  }

  return (
    <Card className="rounded-2xl border border-gray-200 bg-white p-0 dark:border-zinc-800 dark:bg-[#0F0F12]">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-xl font-medium text-gray-900 dark:text-white">
          <span className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-gray-500" />
            Prissättning
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{formBody}</CardContent>
    </Card>
  );
}
