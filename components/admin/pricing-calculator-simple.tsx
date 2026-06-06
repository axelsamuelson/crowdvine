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
import { Switch } from "@/components/ui/switch";
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

interface PricingData {
  cost_currency: string;
  cost_amount: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  calculated_price_cents: number;
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

  const updatePricingData = (field: keyof PricingData, value: any) => {
    if (!showMargin && field === "margin_percentage") return;
    onPricingChange({
      ...pricingData,
      [field]: value,
      ...(!showMargin && { margin_percentage: DEFAULT_PRODUCER_MARGIN }),
    });
  };

  const fetchCurrentRate = async (currency: string) => {
    if (currency === "SEK") return;

    setLoadingRate(true);
    try {
      const response = await fetch(
        `/api/exchange-rates?from=${currency}&to=SEK`,
      );
      const data = await response.json();
      setCurrentRate(data.rate);
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
    } finally {
      setLoadingRate(false);
    }
  };

  useEffect(() => {
    if (pricingData.cost_currency) {
      fetchCurrentRate(pricingData.cost_currency);
    }
  }, [pricingData.cost_currency]);

  const breakdown = useMemo(() => {
    const exchangeRate =
      pricingData.cost_currency === "SEK" ? 1 : currentRate || 1;
    const alcoholTaxInSek = 22.19;
    const costAmountInSek = (pricingData.cost_amount || 0) * exchangeRate;
    const costInSek = costAmountInSek + alcoholTaxInSek;

    const marginDecimal = (effectiveMargin || 0) / 100;
    const denom = 1 - marginDecimal;
    const vatRate = pricingData.price_includes_vat ? 0.25 : 0;

    const isValid = denom > 0;
    const priceExVat = isValid ? costInSek / denom : 0;
    const finalPrice = isValid ? priceExVat * (1 + vatRate) : 0;
    const finalPriceCents = Math.round(finalPrice * 100);
    // Profit should be calculated ex VAT (otherwise VAT looks like profit).
    const netProfitSek = Math.max(0, priceExVat - costInSek);
    const vatAmountSek = Math.max(0, finalPrice - priceExVat);

    const sbPrice = calculateSystembolagetPrice(
      pricingData.cost_amount || 0,
      exchangeRate,
      2219,
    );

    return {
      isValid,
      exchangeRate,
      alcoholTaxInSek,
      costAmountInSek,
      costInSek,
      priceExVat,
      finalPrice,
      finalPriceCents,
      netProfitSek,
      vatAmountSek,
      sbPrice,
    };
  }, [
    pricingData.cost_amount,
    pricingData.cost_currency,
    effectiveMargin,
    pricingData.price_includes_vat,
    currentRate,
  ]);

  // Keep parent in sync with computed final price (avoid infinite loops)
  useEffect(() => {
    if (!breakdown.isValid) return;
    if (pricingData.calculated_price_cents === breakdown.finalPriceCents) return;
    onPricingChange({
      ...pricingData,
      calculated_price_cents: breakdown.finalPriceCents,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown.finalPriceCents, breakdown.isValid]);

  const formBody = (
    <>
        {/* Inputs */}
        <div className={`grid grid-cols-1 gap-4 ${showMargin ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <div className="space-y-2 md:col-span-1">
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

          <div className="space-y-2 md:col-span-1">
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
            <div className="space-y-2 md:col-span-1">
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

          <div className="flex items-end gap-2 md:col-span-1">
            <div className="flex h-10 items-center gap-2">
              <Switch
                id="price_includes_vat"
                checked={pricingData.price_includes_vat}
                onCheckedChange={(checked) =>
                  updatePricingData("price_includes_vat", checked)
                }
              />
              <Label htmlFor="price_includes_vat" className="text-sm">
                Moms (25%)
              </Label>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-zinc-400">
                Slutpris
              </div>
              <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                {(breakdown.finalPriceCents / 100).toFixed(2)} SEK
              </div>
              {!breakdown.isValid && (
                <div className="mt-1 text-sm text-red-600">
                  Marginalen måste vara under 100%.
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="text-gray-500 dark:text-zinc-400">Total kostnad</div>
              <div className="text-right font-medium text-gray-900 dark:text-zinc-100">
                {breakdown.costInSek.toFixed(2)} SEK
              </div>
              <div className="text-gray-500 dark:text-zinc-400">Moms</div>
              <div className="text-right font-medium text-gray-900 dark:text-zinc-100">
                {pricingData.price_includes_vat
                  ? `${breakdown.vatAmountSek.toFixed(2)} SEK`
                  : "—"}
              </div>
              <div className="text-gray-500 dark:text-zinc-400">
                Nettovinst (exkl. moms)
              </div>
              <div className="text-right font-medium text-gray-900 dark:text-zinc-100">
                {breakdown.netProfitSek.toFixed(2)} SEK
              </div>
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
                className="rounded-lg border-gray-200 text-xs dark:border-zinc-700"
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
        <CardTitle className="flex items-center gap-2 text-xl font-medium text-gray-900 dark:text-white">
          <Calculator className="h-5 w-5 text-gray-500" />
          Prissättning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">{formBody}</CardContent>
    </Card>
  );
}
