"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProducerValidation } from "@/lib/checkout-validation";
import { useCart } from "@/components/cart/cart-context";
import { ArrowRight, Package, Users, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

export function ProducerValidationDisplay() {
  const { cart } = useCart();
  const [validations, setValidations] = useState<ProducerValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateCart = async () => {
      if (!cart) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cart }),
        });

        if (!response.ok) {
          throw new Error('Failed to validate cart');
        }

        const result = await response.json();
        setValidations(result.producerValidations || []);
      } catch (err) {
        console.error('Cart validation error:', err);
        setError('Failed to load validation data');
      } finally {
        setIsLoading(false);
      }
    };

    validateCart();
  }, [cart]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invalidValidations = validations.filter(v => !v.isValid);

  if (invalidValidations.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="text-center">
            <Package className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Order Complete!
            </h3>
            <p className="text-green-700 mb-4">
              All producers have the minimum required bottles. You can proceed to checkout.
            </p>
            <Link href="/checkout">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {invalidValidations.map(err => (
        <motion.div
          key={err.producerHandle || err.groupId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-amber-900">
                      {err.producerName || err.groupName}
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                      {err.groupId ? 'Producer Group' : 'Individual Producer'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  Needs {err.required - err.current} more bottles
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-amber-800 mb-2">
                    <span>Current bottles: {err.current}</span>
                    <span>Required: {err.required}</span>
                  </div>
                  <Progress 
                    value={(err.current / err.required) * 100} 
                    className="h-2 bg-amber-200"
                  />
                </div>
                
                <div className="pt-2">
                  <Link 
                    href={err.groupId 
                      ? `/shop/group/${err.groupId}` 
                      : `/shop/${err.producerHandle}`
                    }
                  >
                    <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                      Add More Bottles from {err.producerName || err.groupName}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              Why do I need 6 bottles per producer?
            </h4>
            <p className="text-sm text-blue-800">
              Our shipping model requires a minimum of 6 bottles per producer to ensure efficient and cost-effective delivery. This helps us keep shipping costs low and maintain quality control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
