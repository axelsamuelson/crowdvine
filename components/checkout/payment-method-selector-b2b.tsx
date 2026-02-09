"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PaymentMethodType = "card" | "invoice";

interface PaymentMethodSelectorB2BProps {
  onPaymentMethodSelected: (method: PaymentMethodType) => void;
  selectedMethod?: PaymentMethodType;
  hasWarehouseItems: boolean;
  hasProducerItems: boolean;
}

export function PaymentMethodSelectorB2B({
  onPaymentMethodSelected,
  selectedMethod = "card",
  hasWarehouseItems,
  hasProducerItems,
}: PaymentMethodSelectorB2BProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment Method</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Card Payment */}
        <Card
          className={cn(
            "cursor-pointer transition-all border-2",
            selectedMethod === "card"
              ? "border-black bg-black text-white"
              : "border-gray-200 hover:border-gray-300 bg-white"
          )}
          onClick={() => onPaymentMethodSelected("card")}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className={cn(
                  "w-5 h-5",
                  selectedMethod === "card" ? "text-white" : "text-gray-500"
                )} />
                <div>
                  <p className={cn(
                    "font-medium",
                    selectedMethod === "card" ? "text-white" : "text-gray-900"
                  )}>
                    Card Payment
                  </p>
                  <p className={cn(
                    "text-sm",
                    selectedMethod === "card" ? "text-white/80" : "text-gray-600"
                  )}>
                    Pay immediately
                  </p>
                </div>
              </div>
              {selectedMethod === "card" && (
                <Check className="w-5 h-5 text-white" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Payment */}
        <Card
          className={cn(
            "cursor-pointer transition-all border-2",
            selectedMethod === "invoice"
              ? "border-black bg-black text-white"
              : "border-gray-200 hover:border-gray-300 bg-white",
            !hasWarehouseItems && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => {
            if (hasWarehouseItems) {
              onPaymentMethodSelected("invoice");
            }
          }}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className={cn(
                  "w-5 h-5",
                  selectedMethod === "invoice" ? "text-white" : "text-gray-500"
                )} />
                <div>
                  <p className={cn(
                    "font-medium",
                    selectedMethod === "invoice" ? "text-white" : "text-gray-900"
                  )}>
                    Invoice
                  </p>
                  <p className={cn(
                    "text-sm",
                    selectedMethod === "invoice" ? "text-white/80" : "text-gray-600"
                  )}>
                    {hasWarehouseItems 
                      ? "Pay within 30 days" 
                      : "Only for warehouse orders"}
                  </p>
                </div>
              </div>
              {selectedMethod === "invoice" && (
                <Check className="w-5 h-5 text-white" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasWarehouseItems && hasProducerItems && (
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p>
            <strong>Note:</strong> Invoice payment is only available for warehouse orders. 
            Producer orders will be charged when the pallet is complete.
          </p>
        </div>
      )}

      {!hasWarehouseItems && hasProducerItems && (
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p>
            <strong>Reservation Checkout:</strong> No payment will be charged now. 
            We only charge when the matching pallet is triggered.
          </p>
        </div>
      )}
    </div>
  );
}
