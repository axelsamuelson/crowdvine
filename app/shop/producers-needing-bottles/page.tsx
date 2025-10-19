import { Suspense } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { getProducerValidations } from "@/lib/checkout-validation";
import { getCart } from "@/lib/cart/cart-service";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ProducerValidationDisplay } from "./producer-validation-display";

export default async function ProducersNeedingBottlesPage() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Complete Your Order
            </h1>
            <p className="text-lg text-muted-foreground">
              Add more bottles from these producers to complete your order. Each producer requires a minimum of 6 bottles.
            </p>
          </div>

          <Suspense fallback={
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          }>
            <ProducerValidationDisplay />
          </Suspense>
        </div>
      </div>
    </PageLayout>
  );
}
