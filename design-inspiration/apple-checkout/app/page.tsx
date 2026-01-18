import type { Metadata } from "next"
import ProductCheckout from "@/components/product-checkout"

export const metadata: Metadata = {
  title: "Apple Store Checkout",
  description: "Apple-inspired checkout experience",
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4 md:px-6">
        <h1 className="text-2xl font-medium text-gray-900 mb-8">Apple Store Checkout</h1>
        <ProductCheckout />
      </div>
    </main>
  )
}
