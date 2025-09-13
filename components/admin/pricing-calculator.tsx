"use client";

import { useState, useEffect } from "react";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, Calendar, BarChart3, Store } from "lucide-react";
import { calculateSystembolagetPrice, calculateSystembolagetPriceBreakdown } from "@/lib/systembolaget-pricing";

interface PricingData {
  cost_currency: string;
  cost_amount: number;
  exchange_rate_source: string;
  exchange_rate_date?: string;
  exchange_rate_period_start?: string;
  exchange_rate_period_end?: string;
  exchange_rate?: number;
  alcohol_tax_cents: number;
  price_includes_vat: boolean;
  margin_percentage: number;
  calculated_price_cents: number;
}

interface PricingCalculatorProps {
  pricingData: PricingData;
  onPricingChange: (data: PricingData) => void;
}

export function PricingCalculator({
  pricingData,
  onPricingChange,
}: PricingCalculatorProps) {
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const currencies = [
    { code: "EUR", name: "Euro (EUR)" },
    { code: "USD", name: "US Dollar (USD)" },
    { code: "GBP", name: "British Pound (GBP)" },
    { code: "SEK", name: "Swedish Krona (SEK)" },
  ];

  const exchangeRateSources = [
    { value: "current", label: "Current Rate", icon: TrendingUp },
    { value: "static_date", label: "Static Date", icon: Calendar },
    { value: "period_average", label: "Period Average", icon: BarChart3 },
  ];

  const updatePricingData = (field: keyof PricingData, value: any) => {
    onPricingChange({
      ...pricingData,
      [field]: value,
    });
  };

  const fetchCurrentRate = async (currency: string) => {
    if (currency === "SEK") return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/exchange-rates?from=${currency}&to=SEK`,
      );
      const data = await response.json();
      setCurrentRate(data.rate);
    } catch (error) {
      console.error("Failed to fetch exchange rate:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      pricingData.cost_currency &&
      pricingData.exchange_rate_source === "current"
    ) {
      fetchCurrentRate(pricingData.cost_currency);
    }
  }, [pricingData.cost_currency, pricingData.exchange_rate_source]);

  const calculatePriceBreakdown = () => {
    const costInSek =
      pricingData.cost_amount * (currentRate || pricingData.exchange_rate || 1);
    const priceBeforeTax =
      costInSek * (1 + pricingData.margin_percentage / 100);
    const priceAfterTax = priceBeforeTax + pricingData.alcohol_tax_cents / 100;
    const finalPrice = pricingData.price_includes_vat
      ? priceAfterTax
      : priceAfterTax * 1.25;

    // Calculate Systembolaget price using same formula but with 14.7% margin
    const sbPrice = calculateSystembolagetPrice(
      pricingData.cost_amount,
      currentRate || pricingData.exchange_rate || 1,
      pricingData.alcohol_tax_cents
    );

    // Calculate our margin in SEK
    const ourMarginSek = finalPrice - costInSek;

    return {
      costInSek: costInSek.toFixed(2),
      priceBeforeTax: priceBeforeTax.toFixed(2),
      priceAfterTax: priceAfterTax.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      finalPriceCents: Math.ceil(finalPrice * 100), // Round up to nearest cent
      sbPrice: sbPrice.toFixed(2),
      ourMarginSek: ourMarginSek.toFixed(2),
      priceDifference: (sbPrice - finalPrice).toFixed(2),
      priceDifferencePercent: (((sbPrice - finalPrice) / finalPrice) * 100).toFixed(1)
    };
  };

  const breakdown = calculatePriceBreakdown();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pricing Calculator
        </CardTitle>
        <CardDescription>
          Configure cost, exchange rates, taxes, and margins to calculate final
          price
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cost_currency">Cost Currency</Label>
            <Select
              value={pricingData.cost_currency}
              onValueChange={(value) => {
                updatePricingData("cost_currency", value);
                if (pricingData.exchange_rate_source === "current") {
                  fetchCurrentRate(value);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_amount">Cost Amount</Label>
            <Input
              id="cost_amount"
              type="number"
              step="0.01"
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
        </div>

        {/* Exchange Rate Configuration */}
        <div className="space-y-4">
          <Label>Exchange Rate Source</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exchangeRateSources.map((source) => {
              const Icon = source.icon;
              return (
                <div
                  key={source.value}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    pricingData.exchange_rate_source === source.value
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() =>
                    updatePricingData("exchange_rate_source", source.value)
                  }
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{source.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {source.value === "current" && "Use today's rate"}
                    {source.value === "static_date" &&
                      "Use rate from specific date"}
                    {source.value === "period_average" &&
                      "Use average over period"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Exchange Rate Date Fields */}
          {pricingData.exchange_rate_source === "static_date" && (
            <div className="space-y-2">
              <Label htmlFor="exchange_rate_date">Exchange Rate Date</Label>
              <Input
                id="exchange_rate_date"
                type="date"
                value={pricingData.exchange_rate_date || ""}
                onChange={(e) =>
                  updatePricingData("exchange_rate_date", e.target.value)
                }
              />
            </div>
          )}

          {pricingData.exchange_rate_source === "period_average" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exchange_rate_period_start">Period Start</Label>
                <Input
                  id="exchange_rate_period_start"
                  type="date"
                  value={pricingData.exchange_rate_period_start || ""}
                  onChange={(e) =>
                    updatePricingData(
                      "exchange_rate_period_start",
                      e.target.value,
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exchange_rate_period_end">Period End</Label>
                <Input
                  id="exchange_rate_period_end"
                  type="date"
                  value={pricingData.exchange_rate_period_end || ""}
                  onChange={(e) =>
                    updatePricingData(
                      "exchange_rate_period_end",
                      e.target.value,
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* Manual Exchange Rate */}
          <div className="space-y-2">
            <Label htmlFor="exchange_rate">
              Manual Exchange Rate (optional)
            </Label>
            <Input
              id="exchange_rate"
              type="number"
              step="0.000001"
              value={pricingData.exchange_rate || ""}
              onChange={(e) =>
                updatePricingData(
                  "exchange_rate",
                  parseFloat(e.target.value) || undefined,
                )
              }
              placeholder="11.25"
            />
          </div>
        </div>

        {/* Tax and Margin Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alcohol_tax_cents">Alcohol Tax (SEK)</Label>
            <Input
              id="alcohol_tax_cents"
              type="number"
              step="0.01"
              value={(pricingData.alcohol_tax_cents / 100).toFixed(2)}
              onChange={(e) =>
                updatePricingData(
                  "alcohol_tax_cents",
                  Math.round(parseFloat(e.target.value) * 100) || 0,
                )
              }
              placeholder="2.20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin_percentage">Margin (%)</Label>
            <Input
              id="margin_percentage"
              type="number"
              step="0.01"
              value={pricingData.margin_percentage}
              onChange={(e) =>
                updatePricingData(
                  "margin_percentage",
                  parseFloat(e.target.value) || 0,
                )
              }
              placeholder="30.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_includes_vat">Price Includes VAT</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="price_includes_vat"
                checked={pricingData.price_includes_vat}
                onCheckedChange={(checked) =>
                  updatePricingData("price_includes_vat", checked)
                }
              />
              <Label htmlFor="price_includes_vat" className="text-sm">
                {pricingData.price_includes_vat
                  ? "Including VAT"
                  : "Excluding VAT"}
              </Label>
            </div>
          </div>
        </div>

        {/* Price Breakdown */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Cost in SEK:</span>
              <span className="font-medium">{breakdown.costInSek} SEK</span>
            </div>
            <div className="flex justify-between">
              <span>Price before tax:</span>
              <span className="font-medium">
                {breakdown.priceBeforeTax} SEK
              </span>
            </div>
            <div className="flex justify-between">
              <span>Price after alcohol tax:</span>
              <span className="font-medium">{breakdown.priceAfterTax} SEK</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Final Price:</span>
              <Badge variant="default" className="text-lg">
                {breakdown.finalPrice} SEK
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Systembolaget Comparison */}
        <Card className="bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              Systembolaget Comparison
            </CardTitle>
            <CardDescription>
              Compare your pricing with Systembolaget's pricing (14.7% margin)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Your Price:</span>
                  <Badge variant="default" className="text-lg">
                    {breakdown.finalPrice} SEK
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Your Margin:</span>
                  <span className="font-medium text-blue-600">
                    {breakdown.ourMarginSek} SEK ({pricingData.margin_percentage}%)
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Systembolaget Price:</span>
                  <Badge variant="outline" className="text-lg">
                    {breakdown.sbPrice} SEK
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Price Difference:</span>
                  <span className={`font-medium ${
                    parseFloat(breakdown.priceDifference) > 0 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    {parseFloat(breakdown.priceDifference) > 0 ? '+' : ''}
                    {breakdown.priceDifference} SEK ({breakdown.priceDifferencePercent}%)
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-white p-3 rounded border">
              <strong>Competitive Analysis:</strong> {
                parseFloat(breakdown.priceDifference) > 0 
                  ? `Systembolaget is ${breakdown.priceDifference} SEK (${breakdown.priceDifferencePercent}%) more expensive than your price.`
                  : parseFloat(breakdown.priceDifference) < 0
                  ? `You are ${Math.abs(parseFloat(breakdown.priceDifference))} SEK (${Math.abs(parseFloat(breakdown.priceDifferencePercent))}%) more expensive than Systembolaget.`
                  : 'Your price matches Systembolaget exactly.'
              }
            </div>
          </CardContent>
        </Card>

        {/* Current Exchange Rate Display */}
        {currentRate && pricingData.exchange_rate_source === "current" && (
          <div className="text-sm text-gray-600">
            Current exchange rate: 1 {pricingData.cost_currency} ={" "}
            {currentRate.toFixed(4)} SEK
          </div>
        )}
      </CardContent>
    </Card>
  );
}
