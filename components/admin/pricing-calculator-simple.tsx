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
import {
  Calculator,
  TrendingUp,
  Store,
} from "lucide-react";
import {
  calculateSystembolagetPrice,
} from "@/lib/systembolaget-pricing";

interface PricingData {
  cost_currency: string;
  cost_amount: number;
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
    if (pricingData.cost_currency) {
      fetchCurrentRate(pricingData.cost_currency);
    }
  }, [pricingData.cost_currency]);

  const calculatePriceBreakdown = () => {
    const exchangeRate = pricingData.cost_currency === "SEK" ? 1 : (currentRate || 1);
    const costInSek = pricingData.cost_amount * exchangeRate;
    const priceBeforeTax =
      costInSek * (1 + pricingData.margin_percentage / 100);
    const priceAfterTax = priceBeforeTax + pricingData.alcohol_tax_cents / 100;
    const finalPrice = pricingData.price_includes_vat
      ? priceAfterTax
      : priceAfterTax * 1.25;

    // Calculate Systembolaget price using same formula but with 14.7% margin
    const sbPrice = calculateSystembolagetPrice(
      pricingData.cost_amount,
      exchangeRate,
      pricingData.alcohol_tax_cents,
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
      priceDifferencePercent: (
        ((sbPrice - finalPrice) / finalPrice) *
        100
      ).toFixed(1),
      exchangeRateUsed: exchangeRate.toFixed(4),
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
          Simple pricing with automatic exchange rates and transparent calculations
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
                fetchCurrentRate(value);
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

        {/* Exchange Rate Info */}
        {pricingData.cost_currency !== "SEK" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <Label>Current Exchange Rate</Label>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800">
                  1 {pricingData.cost_currency} = {breakdown.exchangeRateUsed} SEK
                </span>
                {loading && (
                  <div className="text-xs text-blue-600">
                    Updating...
                  </div>
                )}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Automatically fetched from live currency API
              </p>
            </div>
          </div>
        )}

        {/* Tax and Margin Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="alcohol_tax_cents">Alcohol Tax (SEK)</Label>
            <Input
              id="alcohol_tax_cents"
              type="number"
              step="0.01"
              value={pricingData.alcohol_tax_cents / 100}
              onChange={(e) =>
                updatePricingData(
                  "alcohol_tax_cents",
                  (parseFloat(e.target.value) || 0) * 100,
                )
              }
              placeholder="7.50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="margin_percentage">Margin Percentage (%)</Label>
            <Input
              id="margin_percentage"
              type="number"
              step="0.1"
              value={pricingData.margin_percentage}
              onChange={(e) =>
                updatePricingData(
                  "margin_percentage",
                  parseFloat(e.target.value) || 0,
                )
              }
              placeholder="30.0"
            />
          </div>
        </div>

        {/* VAT Configuration */}
        <div className="flex items-center space-x-2">
          <Switch
            id="price_includes_vat"
            checked={pricingData.price_includes_vat}
            onCheckedChange={(checked) =>
              updatePricingData("price_includes_vat", checked)
            }
          />
          <Label htmlFor="price_includes_vat">
            Price includes VAT (25%)
          </Label>
        </div>

        {/* Price Breakdown */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Store />
            Price Breakdown
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Cost in SEK:</span>
                <span className="font-medium">{breakdown.costInSek} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price before tax:</span>
                <span className="font-medium">{breakdown.priceBeforeTax} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Final price:</span>
                <span className="font-bold text-lg">{breakdown.finalPrice} SEK</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Systembolaget price:</span>
                <span className="font-medium">{breakdown.sbPrice} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Our margin:</span>
                <span className="font-medium text-green-600">{breakdown.ourMarginSek} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price difference:</span>
                <span className={`font-medium ${
                  parseFloat(breakdown.priceDifference) < 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {breakdown.priceDifference} SEK ({breakdown.priceDifferencePercent}%)
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Final Price (rounded up to nearest SEK):</span>
              <Badge variant="secondary" className="bg-gray-100 text-gray-900 font-semibold">
                {breakdown.finalPriceCents / 100} SEK
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
