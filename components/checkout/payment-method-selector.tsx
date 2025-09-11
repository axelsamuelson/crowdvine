"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Plus, Check, X } from "lucide-react";

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

interface PaymentMethodSelectorProps {
  onPaymentMethodSelected: (method: PaymentMethod | null) => void;
  selectedMethod?: PaymentMethod | null;
}

export function PaymentMethodSelector({ onPaymentMethodSelected, selectedMethod }: PaymentMethodSelectorProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/user/payment-methods');
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data);
        
        // Auto-select default payment method if none selected
        if (!selectedMethod && data.length > 0) {
          const defaultMethod = data.find((method: PaymentMethod) => method.is_default) || data[0];
          onPaymentMethodSelected(defaultMethod);
        }
      }
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    try {
      // Get user profile to get email and name
      const profileResponse = await fetch('/api/user/profile');
      if (!profileResponse.ok) {
        toast.error("Please add your profile information first");
        return;
      }
      
      const profile = await profileResponse.json();
      if (!profile.email) {
        toast.error("Email is required to add payment method");
        return;
      }

      // Redirect to Stripe setup
      const response = await fetch(
        `/api/checkout/setup?email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.full_name || '')}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to setup payment method");
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to setup payment method");
      }
      
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error("Failed to add payment method");
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${methodId}/set-default`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      // Update local state
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          is_default: method.id === methodId
        }))
      );
      
      toast.success("Default payment method updated");
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error("Failed to update default payment method");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Payment Method</h3>
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Payment Method</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Add Payment Method</h3>
                <p className="text-gray-600 mb-4">
                  You'll be redirected to Stripe to securely add your payment method. 
                  This will be saved for future reservations.
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddPaymentMethod} className="flex-1">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
                <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {paymentMethods.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No payment methods added yet</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <Card 
              key={method.id} 
              className={`cursor-pointer transition-all ${
                selectedMethod?.id === method.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onPaymentMethodSelected(method)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">
                        {method.brand?.toUpperCase()} •••• {method.last4}
                      </p>
                      <p className="text-sm text-gray-600">
                        Expires {method.expiry_month}/{method.expiry_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.is_default && (
                      <Badge variant="default" className="bg-green-600">Default</Badge>
                    )}
                    {selectedMethod?.id === method.id && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {paymentMethods.length > 0 && (
        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
          <p><strong>Reservation Checkout:</strong> No payment will be charged now. We only charge when the matching pallet is triggered.</p>
        </div>
      )}
    </div>
  );
}
