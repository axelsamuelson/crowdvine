"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, FileText, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShoppingContext } from "@/lib/context/shopping-context-provider";

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
  const { t } = useShoppingContext();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("checkout.paymentMethod")}</h3>
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
                    {t("checkout.cardPayment")}
                  </p>
                  <p className={cn(
                    "text-sm",
                    selectedMethod === "card" ? "text-white/80" : "text-gray-600"
                  )}>
                    {t("checkout.payImmediately")}
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
                    {t("checkout.invoiceLabel")}
                  </p>
                  <p className={cn(
                    "text-sm",
                    selectedMethod === "invoice" ? "text-white/80" : "text-gray-600"
                  )}>
                    {hasWarehouseItems
                      ? t("checkout.payWithin30Days")
                      : t("checkout.invoiceProducerOnly")}
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
            {t("checkout.b2bNoteMixed")}
          </p>
        </div>
      )}

      {!hasWarehouseItems && hasProducerItems && (
        <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
          <p>{t("checkout.b2bNoteReservation")}</p>
        </div>
      )}
    </div>
  );
}
