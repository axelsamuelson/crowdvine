"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import CheckoutForm from "./checkout-form"
import StickyPriceFooter from "./sticky-price-footer"
import ImageCarousel from "./image-carousel"

const basePrice = 999

// MacBook Air images
const macbookImages = [
  "/placeholder.svg?height=400&width=400&text=MacBook+Air+Front",
  "/placeholder.svg?height=400&width=400&text=MacBook+Air+Side",
  "/placeholder.svg?height=400&width=400&text=MacBook+Air+Open",
]

// Screen size options
const screenOptions = [
  { id: "13inch", name: "13-inch", price: 0 },
  { id: "15inch", name: "15-inch", price: 200 },
]

// Chip/processor options
const chipOptions = [
  { id: "m1", name: "M1 Chip", price: 0 },
  { id: "m1pro", name: "M1 Pro Chip", price: 200 },
  { id: "m1max", name: "M1 Max Chip", price: 400 },
]

// Memory options
const memoryOptions = [
  { id: "8gb", name: "8GB unified memory", price: 0 },
  { id: "16gb", name: "16GB unified memory", price: 200 },
  { id: "32gb", name: "32GB unified memory", price: 400 },
]

// Storage options
const storageOptions = [
  { id: "128gb", name: "128GB", price: 0 },
  { id: "256gb", name: "256GB", price: 200 },
  { id: "512gb", name: "512GB", price: 400 },
  { id: "1tb", name: "1TB", price: 600 },
]

// Power adapter options
const adapterOptions = [
  { id: "standard", name: "Standard Power Adapter", price: 0 },
  { id: "fast", name: "Fast Charging Power Adapter", price: 79 },
]

// Updated color options
const colorOptions = [
  { id: "sky-blue", name: "Sky Blue", color: "bg-sky-300" },
  { id: "silver", name: "Silver", color: "bg-gray-200" },
  { id: "starlight", name: "Starlight", color: "bg-amber-50" },
  { id: "midnight", name: "Midnight", color: "bg-slate-900" },
]

export default function ProductCheckout() {
  const [selectedScreen, setSelectedScreen] = useState(screenOptions[0])
  const [selectedChip, setSelectedChip] = useState(chipOptions[0])
  const [selectedMemory, setSelectedMemory] = useState(memoryOptions[0])
  const [selectedStorage, setSelectedStorage] = useState(storageOptions[0])
  const [selectedAdapter, setSelectedAdapter] = useState(adapterOptions[0])
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [showStickyFooter, setShowStickyFooter] = useState(false)

  // Calculate total price based on all selected options
  const totalPrice =
    basePrice +
    selectedScreen.price +
    selectedChip.price +
    selectedMemory.price +
    selectedStorage.price +
    selectedAdapter.price

  // Always show sticky footer when not in checkout
  useEffect(() => {
    setShowStickyFooter(!showCheckoutForm)
  }, [showCheckoutForm])

  // Add padding to the bottom of the page to account for the sticky footer
  useEffect(() => {
    if (!showCheckoutForm) {
      document.body.style.paddingBottom = "80px"
    } else {
      document.body.style.paddingBottom = "0"
    }

    return () => {
      document.body.style.paddingBottom = "0"
    }
  }, [showCheckoutForm])

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column - Product image and basic details */}
        <div>
          <Card className="p-6 bg-white">
            <div className="flex flex-col items-center mb-6">
              {/* Replace static image with carousel */}
              <ImageCarousel images={macbookImages} alt="MacBook Air" />

              <h2 className="text-2xl font-medium text-gray-900 mb-2">MacBook Air</h2>
              <p className="text-gray-500 text-center mb-4">Impossibly thin. Impressively capable.</p>
              <div className="w-full text-sm text-gray-600 space-y-1">
                <p>• Apple M4 chip with 10-core CPU, 8-core GPU, 16‑core Neural Engine</p>
                <p>• 16GB unified memory</p>
                <p>• 256GB SSD storage</p>
                <p>• 13.6-inch Liquid Retina display with True Tone²</p>
                <p>• 12MP Center Stage camera</p>
                <p>• MagSafe 3 charging port</p>
                <p>• Two Thunderbolt 4 ports</p>
                <p>• 30W USB-C Power Adapter</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column - Options and checkout form */}
        <div>
          <Card className="p-6 bg-white mb-6">
            {/* Screen Size */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Screen Size</h3>
              <div className="grid grid-cols-2 gap-3">
                {screenOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedScreen(option)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedScreen.id === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.name}</span>
                      {selectedScreen.id === option.id && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {option.price === 0 ? "Included" : `+$${option.price.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chip/Processor */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Chip</h3>
              <div className="grid grid-cols-1 gap-3">
                {chipOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedChip(option)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedChip.id === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.name}</span>
                      {selectedChip.id === option.id && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {option.price === 0 ? "Included" : `+$${option.price.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Memory */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Memory</h3>
              <div className="grid grid-cols-1 gap-3">
                {memoryOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedMemory(option)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedMemory.id === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.name}</span>
                      {selectedMemory.id === option.id && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {option.price === 0 ? "Included" : `+$${option.price.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Storage */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Storage</h3>
              <div className="grid grid-cols-2 gap-3">
                {storageOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedStorage(option)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedStorage.id === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.name}</span>
                      {selectedStorage.id === option.id && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {option.price === 0 ? "Included" : `+$${option.price.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Power Adapter */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Power Adapter</h3>
              <div className="grid grid-cols-1 gap-3">
                {adapterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedAdapter(option)}
                    className={`border rounded-xl p-4 text-left transition-all ${
                      selectedAdapter.id === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{option.name}</span>
                      {selectedAdapter.id === option.id && <Check className="h-5 w-5 text-blue-500" />}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {option.price === 0 ? "Included" : `+$${option.price.toLocaleString()}`}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Color</h3>
              <div className="flex flex-wrap gap-4">
                {colorOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedColor(option)}
                    className={`flex flex-col items-center transition-all ${
                      selectedColor.id === option.id ? "scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${option.color} border border-gray-200 mb-2 ${
                        selectedColor.id === option.id ? "ring-2 ring-blue-500 ring-offset-2" : ""
                      }`}
                    ></div>
                    <span className="text-sm">{option.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Removed the "Continue to Checkout" button */}
          </Card>

          {showCheckoutForm && (
            <CheckoutForm
              totalPrice={totalPrice}
              productDetails={{
                name: "MacBook Air",
                screen: selectedScreen.name,
                chip: selectedChip.name,
                memory: selectedMemory.name,
                storage: selectedStorage.name,
                adapter: selectedAdapter.name,
                color: selectedColor.name,
              }}
            />
          )}
        </div>
      </div>

      {/* Sticky price footer - always shown when checkout form is not visible */}
      {!showCheckoutForm && (
        <StickyPriceFooter
          totalPrice={totalPrice}
          basePrice={basePrice}
          options={[
            { name: "Screen", price: selectedScreen.price },
            { name: "Chip", price: selectedChip.price },
            { name: "Memory", price: selectedMemory.price },
            { name: "Storage", price: selectedStorage.price },
            { name: "Power Adapter", price: selectedAdapter.price },
          ]}
          onCheckout={() => {
            setShowCheckoutForm(true)
            window.scrollTo({ top: 0, behavior: "smooth" })
          }}
        />
      )}
    </>
  )
}
