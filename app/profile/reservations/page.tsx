"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  Calendar, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck, 
  Home,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_id?: string;
  pallet_name?: string;
  delivery_zone?: string;
  delivery_address?: string;
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
  }>;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedReservations, setGroupedReservations] = useState<Record<string, Reservation[]>>({});

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/user/reservations');
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      const data = await response.json();
      setReservations(data);
      
      // Group reservations by pallet
      const grouped = data.reduce((acc: Record<string, Reservation[]>, reservation: Reservation) => {
        const palletKey = reservation.pallet_id || 'no-pallet';
        if (!acc[palletKey]) {
          acc[palletKey] = [];
        }
        acc[palletKey].push(reservation);
        return acc;
      }, {});
      
      setGroupedReservations(grouped);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      toast.error("Failed to fetch reservations");
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'placed':
        return <Badge variant="default" className="bg-blue-600"><Clock className="w-3 h-3 mr-1" />Placed</Badge>;
      case 'confirmed':
        return <Badge variant="default" className="bg-yellow-600"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'shipped':
        return <Badge variant="default" className="bg-purple-600"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
      case 'delivered':
        return <Badge variant="default" className="bg-green-600"><Home className="w-3 h-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getOrderJourneySteps = (status: string) => {
    const steps = [
      { key: 'placed', label: 'Order Placed', icon: Clock, completed: true },
      { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, completed: ['confirmed', 'shipped', 'delivered'].includes(status.toLowerCase()) },
      { key: 'shipped', label: 'Shipped', icon: Truck, completed: ['shipped', 'delivered'].includes(status.toLowerCase()) },
      { key: 'delivered', label: 'Delivered', icon: Home, completed: status.toLowerCase() === 'delivered' },
    ];
    
    return steps;
  };

  const estimatePalletCompletion = (palletReservations: Reservation[]) => {
    const totalItems = palletReservations.reduce((sum, res) => 
      sum + res.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    // Assume a pallet holds 12 bottles (this could be configurable)
    const palletCapacity = 12;
    const completionPercentage = Math.min((totalItems / palletCapacity) * 100, 100);
    
    return {
      totalItems,
      palletCapacity,
      completionPercentage: Math.round(completionPercentage)
    };
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading reservations...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
            <p className="text-gray-600 mt-2">Track your wine orders and deliveries</p>
          </div>
        </div>

        {Object.keys(groupedReservations).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reservations yet</h3>
              <p className="text-gray-600 mb-6">Start exploring our wine collection and make your first reservation!</p>
              <Link href="/shop">
                <Button>Browse Wines</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedReservations).map(([palletKey, palletReservations]) => {
              const palletInfo = palletReservations[0];
              const completion = estimatePalletCompletion(palletReservations);
              
              return (
                <Card key={palletKey} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {palletInfo.pallet_name || `Pallet ${palletKey}`}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {palletReservations.length} reservation{palletReservations.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {completion.totalItems} / {completion.palletCapacity} bottles
                        </div>
                        <div className="text-xs text-gray-600">
                          {completion.completionPercentage}% complete
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${completion.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {palletReservations.map((reservation) => {
                        const journeySteps = getOrderJourneySteps(reservation.status);
                        
                        return (
                          <div key={reservation.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  Order #{reservation.order_id}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  Created {new Date(reservation.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(reservation.status)}
                            </div>
                            
                            {/* Order Journey */}
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-3">Order Journey</h4>
                              <div className="flex items-center space-x-4">
                                {journeySteps.map((step, index) => {
                                  const Icon = step.icon;
                                  return (
                                    <div key={step.key} className="flex items-center">
                                      <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                        step.completed 
                                          ? 'bg-green-100 text-green-600' 
                                          : 'bg-gray-100 text-gray-400'
                                      }`}>
                                        <Icon className="w-4 h-4" />
                                      </div>
                                      <span className={`ml-2 text-sm ${
                                        step.completed ? 'text-gray-900' : 'text-gray-500'
                                      }`}>
                                        {step.label}
                                      </span>
                                      {index < journeySteps.length - 1 && (
                                        <div className={`w-8 h-0.5 mx-2 ${
                                          step.completed ? 'bg-green-200' : 'bg-gray-200'
                                        }`} />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Items */}
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
                              <div className="space-y-1">
                                {reservation.items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span className="text-gray-900">
                                      {item.wine_name} {item.vintage}
                                    </span>
                                    <span className="text-gray-600">
                                      {item.quantity} bottle{item.quantity !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Delivery Info */}
                            {reservation.delivery_address && (
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mt-0.5" />
                                <div>
                                  <p className="font-medium">Delivery Address</p>
                                  <p>{reservation.delivery_address}</p>
                                  {reservation.delivery_zone && (
                                    <p className="text-xs text-gray-500">
                                      Zone: {reservation.delivery_zone}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
