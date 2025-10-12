"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, Truck, Home } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      // Fetch payment details from Stripe session
      fetchPaymentDetails(sessionId);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const fetchPaymentDetails = async (sessionId: string) => {
    try {
      // You could create an API endpoint to fetch session details
      // For now, we'll just show a generic success message
      setPaymentDetails({
        amount: "Payment completed",
        status: "success"
      });
    } catch (error) {
      console.error("Error fetching payment details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 pt-top-spacing">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 pt-top-spacing">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Successful! 🎉
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Thank you for your payment. Your wine order has been confirmed and will be shipped soon.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            What Happens Next?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-blue-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Order Processing</h3>
              <p className="text-gray-600 text-sm">
                We're preparing your wine order and coordinating with the producer.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-blue-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Shipping Preparation</h3>
              <p className="text-gray-600 text-sm">
                Your wine will be carefully packaged and prepared for shipping.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Shipping Notification</h3>
              <p className="text-gray-600 text-sm">
                You'll receive an email with tracking information when your order ships.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Home className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Delivery</h3>
              <p className="text-gray-600 text-sm">
                Your wine will be delivered to your designated pickup location.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
        <ul className="text-blue-800 text-sm space-y-2">
          <li>• You'll receive email updates about your order status</li>
          <li>• Shipping typically takes 3-5 business days</li>
          <li>• You can track your order in your profile</li>
          <li>• Contact support if you have any questions</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/profile">
          <Button className="w-full sm:w-auto">
            View My Orders
          </Button>
        </Link>
        
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            Continue Shopping
          </Button>
        </Link>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Questions? Contact us at{" "}
          <a href="mailto:support@pactwines.com" className="text-blue-600 hover:underline">
            support@pactwines.com
          </a>
        </p>
      </div>
    </div>
  );
}
