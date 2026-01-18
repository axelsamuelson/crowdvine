"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { CreditCard, User, MapPin, Lock, CheckCircle } from "lucide-react"

interface CheckoutFormProps {
  totalPrice: number
  productDetails: {
    name: string
    screen: string
    chip: string
    memory: string
    storage: string
    adapter: string
    color: string
  }
}

export default function CheckoutForm({ totalPrice, productDetails }: CheckoutFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setIsComplete(true)
    }, 1500)
  }

  if (isComplete) {
    return (
      <Card className="p-8 bg-white">
        <div className="flex flex-col items-center text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-medium text-gray-900 mb-2">Order Confirmed!</h2>
          <p className="text-gray-500 mb-6">
            Thank you for your purchase. We've sent a confirmation email with your order details.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg w-full mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Product</span>
              <span className="font-medium">{productDetails.name.replace("MacBook Pro", "MacBook Air")}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Screen</span>
              <span className="font-medium">{productDetails.screen}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Chip</span>
              <span className="font-medium">{productDetails.chip}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Memory</span>
              <span className="font-medium">{productDetails.memory}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Storage</span>
              <span className="font-medium">{productDetails.storage}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Power Adapter</span>
              <span className="font-medium">{productDetails.adapter}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Color</span>
              <span className="font-medium">{productDetails.color}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 mt-2">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-gray-900 font-medium">${totalPrice.toLocaleString()}</span>
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={() => window.location.reload()}>
            Continue Shopping
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 bg-white">
      <h2 className="text-xl font-medium text-gray-900 mb-6">Checkout</h2>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-gray-900 mb-2">Order Summary</h3>
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-500">{productDetails.name.replace("MacBook Pro", "MacBook Air")}</span>
          <span className="text-sm font-medium">${totalPrice.toLocaleString()}</span>
        </div>
        <div className="text-xs text-gray-500 mb-3">
          {productDetails.screen} · {productDetails.chip} · {productDetails.color}
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-medium">Total</span>
          <span className="font-medium">${totalPrice.toLocaleString()}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" required />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Shipping Address
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" required />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2" />
              Payment Information
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Name on Card</Label>
                <Input id="cardName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardNumber">Card Number</Label>
                <Input id="cardNumber" placeholder="•••• •••• •••• ••••" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiration Date</Label>
                  <Input id="expiry" placeholder="MM/YY" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">Security Code</Label>
                  <Input id="cvv" placeholder="CVV" required />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : `Pay $${totalPrice.toLocaleString()}`}
          </Button>

          <div className="flex items-center justify-center text-sm text-gray-500 mt-4">
            <Lock className="h-4 w-4 mr-1" />
            <span>Secure checkout</span>
          </div>
        </div>
      </form>
    </Card>
  )
}
