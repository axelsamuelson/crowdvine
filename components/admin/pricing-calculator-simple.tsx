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
import { Calculator, ChevronDown } from "lucide-react";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";
import {
  buildRetailPriceBreakdown,
  DEFAULT_ALCOHOL_TAX_CENTS,
  resolveSekExchangeRateSync,
} from "@/lib/wine-retail-pricing";

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

  const breakdown = useMemo(() => {
    const exchangeRate =
      pricingData.cost_currency === "SEK"
        ? 1
        : currentRate && currentRate > 0
          ? currentRate
          : resolveSekExchangeRateSync(
              pricingData.cost_currency,
              pricingData.exchange_rate,
            );

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
    pricingData.cost_currency,
    pricingData.exchange_rate,
    pricingData.alcohol_tax_cents,
    pricingData.price_includes_vat,
    effectiveMargin,
    currentRate,
  ]);

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
            <div>
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                Slutpris (ink. moms) — sparas till PDP
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {(breakdown.finalPriceCents / 100).toFixed(2)} SEK
              </div>
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <span className="text-zinc-400">Pris exkl. moms</span>
              <span className="text-right font-medium text-zinc-100">
                {breakdown.priceExVat.toFixed(2)} SEK
              </span>
              <span className="text-zinc-400">
                Moms ({(breakdown.vatRate * 100).toFixed(0)}%)
              </span>
              <span className="text-right font-medium text-zinc-100">
                {breakdown.vatAmountSek.toFixed(2)} SEK
              </span>
              <span className="text-zinc-400">Total kostnad</span>
              <span className="text-right font-medium text-zinc-100">
                {breakdown.costInSek.toFixed(2)} SEK
              </span>
              <span className="text-zinc-400">Nettovinst</span>
              <span className="text-right font-medium text-zinc-100">
                {breakdown.netProfitSek.toFixed(2)} SEK
              </span>
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
                <span className="text-gray-500 dark:text-zinc-400">
                  Vinkostnad (SEK)
                </span>
                <span className="font-medium text-gray-900 dark:text-zinc-100">
                  {breakdown.costAmountInSek.toFixed(2)} SEK
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-zinc-400">
                  Alkoholskatt
                </span>
                <span className="font-medium text-gray-900 dark:text-zinc-100">
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
                <span className="text-gray-500 dark:text-zinc-400">
                  Nettovinst (exkl. moms)
                </span>
                <span className="font-medium text-gray-900 dark:text-zinc-100">
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
