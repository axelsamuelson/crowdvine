"use client"

import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown } from "lucide-react"
import { useState } from "react"

interface StickyPriceFooterProps {
  totalPrice: number
  basePrice: number
  options: Array<{ name: string; price: number }>
  onCheckout: () => void
}

export default function StickyPriceFooter({ totalPrice, basePrice, options, onCheckout }: StickyPriceFooterProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transition-all duration-300 ease-in-out">
      {/* Price details panel - shown when expanded */}
      {showDetails && (
        <div className="container mx-auto py-3 px-4 md:px-6 border-b border-gray-100">
          <div className="max-w-md mx-auto">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Base price</span>
              <span className="font-medium">${basePrice.toLocaleString()}</span>
            </div>

            {options.map(
              (option, index) =>
                option.price > 0 && (
                  <div key={index} className="flex justify-between mb-2">
                    <span className="text-gray-500">{option.name} upgrade</span>
                    <span className="font-medium">+${option.price.toLocaleString()}</span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}

      {/* Main footer with total and checkout button */}
      <div className="container mx-auto py-4 px-4 md:px-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <div className="flex flex-col mr-2">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-2xl font-medium text-gray-900">${totalPrice.toLocaleString()}</span>
            </div>
            {showDetails ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>

          <Button onClick={onCheckout} size="lg" className="px-8">
            Continue to Checkout
          </Button>
        </div>
      </div>
    </div>
  )
}
