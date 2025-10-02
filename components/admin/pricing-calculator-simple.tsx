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
    
    // Calculate inclusive cost (C): cost_amount + alcohol_tax converted to SEK
    const costAmountInSek = pricingData.cost_amount * exchangeRate;
    const alcoholTaxInSek = pricingData.alcohol_tax_cents / 100;
    const costInSek = costAmountInSek + alcoholTaxInSek; // C = Cost including alcohol tax, ex VAT
    
    // Gross margin as decimal (e.g., 10% = 0.10)
    const marginDecimal = pricingData.margin_percentage / 100; // M
    
    // VAT rate as decimal (Sweden = 25% = 0.25)
    const vatRate = pricingData.price_includes_vat ? 0.25 : 0; // V
    
    // Step 1: Price ex VAT using gross margin formula: P = C / (1 - M)
    const priceExVat = costInSek / (1 - marginDecimal); // P
    
    // Step 2: Final price incl VAT: F = P × (1 + V)
    const finalPrice = priceExVat * (1 + vatRate); // F
    
    // Calculate our margin in SEK
    const ourMarginSek = finalPrice - costInSek;
    
    // Calculate Systembolaget price using same gross margin formula (they use ~14.7% margin)
    const sbMarginDecimal = 0.147;
    const sbPriceExVat = costInSek / (1 - sbMarginDecimal);
    const sbPrice = sbPriceExVat * 1.25; // Systembolaget includes VAT
    
    // Calculate what margin percentage this becomes of our final price
    const effectiveMarginPercent = ((finalPrice - costInSek) / finalPrice) * 100;

    return {
      costInSek: costInSek.toFixed(2),
      costAmountInSek: costAmountInSek.toFixed(2),
      alcoholTaxInSek: alcoholTaxInSek.toFixed(2),
      priceExVat: priceExVat.toFixed(2),
      finalPrice: finalPrice.toFixed(2),
      finalPriceCents: Math.round(finalPrice * 100), // Round to nearest whole number
      sbPrice: sbPrice.toFixed(2),
      ourMarginSek: ourMarginSek.toFixed(2),
      effectiveMarginPercent: effectiveMarginPercent.toFixed(1),
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
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Store />
            Gross Margin Price Breakdown
          </h4>
          
          {/* Cost Structure */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <h5 className="font-medium text-gray-900 mb-3">Cost Structure (ex VAT)</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Wine cost ({pricingData.cost_currency}):</span>
                <span className="font-medium">{breakdown.costAmountInSek} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alcohol tax:</span>
                <span className="font-medium">{breakdown.alcoholTaxInSek} SEK</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-800 font-medium">Total cost (C):</span>
                <span className="font-semibold">{breakdown.costInSek} SEK</span>
              </div>
            </div>
          </div>

          {/* Pricing Formula Display */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Pricing Formula (Gross Margin)</h5>
            <div className="text-sm space-y-1">
              <div className="font-mono text-blue-800">P = C ÷ (1 - M)</div>
              <div className="text-gray-700">P = {breakdown.costInSek} ÷ (1 - {pricingData.margin_percentage / 100}) = {breakdown.priceExVat} SEK</div>
              {pricingData.price_includes_vat && (
                <div className="font-mono text-blue-800 mt-2">F = P × (1 + V)</div>
              )}
              {pricingData.price_includes_vat && (
                <div className="text-gray-700">F = {breakdown.priceExVat} × 1.25 = {breakdown.finalPrice} SEK</div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Price ex VAT (P):</span>
                <span className="font-semibold">{breakdown.priceExVat} SEK</span>
              </div>
              {pricingData.price_includes_vat && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Final price inc VAT (F):</span>
                  <span className="font-bold text-lg">{breakdown.finalPrice} SEK</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Effective margin:</span>
                <span className="font-medium text-green-600">{breakdown.effectiveMarginPercent}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Systembolaget price:</span>
                <span className="font-medium">{breakdown.sbPrice} SEK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Our margin (SEK):</span>
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
              <span className="text-sm text-gray-700">Final Price (rounded):</span>
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
