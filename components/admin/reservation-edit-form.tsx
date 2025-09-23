"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ReservationEditFormProps {
  reservation: any;
  zones: any[];
  pallets: any[];
  wines: any[];
}

export default function ReservationEditForm({
  reservation,
  zones,
  pallets,
  wines,
}: ReservationEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    status: reservation.status || '',
    order_id: reservation.order_id || '',
    notes: reservation.notes || '',
    pickup_zone_id: reservation.pickup_zone_id || '',
    delivery_zone_id: reservation.delivery_zone_id || '',
    address_id: reservation.address_id || '',
    delivery_address: reservation.user_addresses ? 
      `${reservation.user_addresses.address_street || ''}, ${reservation.user_addresses.address_postcode || ''} ${reservation.user_addresses.address_city || ''}, ${reservation.user_addresses.country_code || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') : 
      reservation.delivery_address || '',
    pallet_id: reservation.pallet_id || '',
  });

  const [items, setItems] = useState(
    reservation.order_reservation_items?.map((item: any) => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity,
      wine: item.wines,
    })) || []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debug: Log the reservation data when component mounts
  useEffect(() => {
    console.log('Reservation data:', reservation);
    console.log('Form data initialized:', {
      status: reservation.status || '',
      order_id: reservation.order_id || '',
      notes: reservation.notes || '',
      pickup_zone_id: reservation.pickup_zone_id || '',
      delivery_zone_id: reservation.delivery_zone_id || '',
      address_id: reservation.address_id || '',
      pallet_id: reservation.pallet_id || '',
      delivery_address: reservation.user_addresses ? 
        `${reservation.user_addresses.address_street || ''}, ${reservation.user_addresses.address_postcode || ''} ${reservation.user_addresses.address_city || ''}, ${reservation.user_addresses.country_code || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '') : 
        reservation.delivery_address || '',
    });
  }, [reservation]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const handleItemWineChange = (index: number, wineId: string) => {
    const selectedWine = wines.find(w => w.id === wineId);
    if (selectedWine) {
      const newItems = [...items];
      newItems[index].item_id = wineId;
      newItems[index].wine = selectedWine;
      setItems(newItems);
    }
  };

  const addNewItem = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      item_id: '',
      quantity: 1,
      wine: null,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotalCost = () => {
    return items.reduce((total, item) => {
      const winePrice = item.wine?.base_price_cents || 0;
      return total + (winePrice * item.quantity);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Update reservation
      const reservationResponse = await fetch(`/api/admin/reservations/${reservation.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          items: items.map(item => ({
            id: item.id.startsWith('new-') ? null : item.id,
            item_id: item.item_id,
            quantity: item.quantity,
          })),
        }),
      });

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json();
        throw new Error(errorData.error || 'Failed to update reservation');
      }

      router.push('/admin/reservations');
    } catch (err) {
      console.error('Error updating reservation:', err);
      setError(err instanceof Error ? err.message : 'Failed to update reservation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Link href="/admin/reservations">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reservations
          </Button>
        </Link>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Reservation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Reservation Details
              </CardTitle>
              <CardDescription>
                Basic information about this reservation
                {reservation.status && (
                  <span className="ml-2 text-blue-600">• Current status: {reservation.status}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="placed">Placed</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_id">Order ID</Label>
                  <Input
                    id="order_id"
                    value={formData.order_id}
                    onChange={(e) => handleInputChange('order_id', e.target.value)}
                    placeholder="Order reference"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes or comments"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Delivery Information
              </CardTitle>
              <CardDescription>
                Zones and delivery address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_zone">Pickup Zone</Label>
                  <Select value={formData.pickup_zone_id} onValueChange={(value) => handleInputChange('pickup_zone_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pickup zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.filter(z => z.type === 'pickup').map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delivery_zone">Delivery Zone</Label>
                  <Select value={formData.delivery_zone_id} onValueChange={(value) => handleInputChange('delivery_zone_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select delivery zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.filter(z => z.type === 'delivery').map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pallet_id">Pallet</Label>
                <Select value={formData.pallet_id} onValueChange={(value) => handleInputChange('pallet_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pallet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No pallet assigned</SelectItem>
                    {pallets.map((pallet) => (
                      <SelectItem key={pallet.id} value={pallet.id}>
                        {pallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_address">Delivery Address</Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                  placeholder="Full delivery address"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reservation Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Reservation Items
                  </CardTitle>
                  <CardDescription>
                    Wines and quantities in this reservation
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {item.wine?.label_image_path && (
                      <div className="w-16 h-16 relative flex-shrink-0">
                        <Image
                          src={item.wine.label_image_path}
                          alt={item.wine.wine_name}
                          fill
                          className="object-cover rounded-lg"
                          sizes="64px"
                        />
                      </div>
                    )}
                    
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <Label>Wine</Label>
                          <Select value={item.item_id} onValueChange={(value) => handleItemWineChange(index, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select wine" />
                            </SelectTrigger>
                            <SelectContent>
                              {wines.map((wine) => (
                                <SelectItem key={wine.id} value={wine.id}>
                                  {wine.wine_name} {wine.vintage}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(index, parseInt(e.target.value) || 1)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label>Total</Label>
                          <div className="text-lg font-semibold text-green-600">
                            {formatPrice((item.wine?.base_price_cents || 0) * item.quantity)}
                          </div>
                        </div>
                      </div>

                      {item.wine && (
                        <div className="flex gap-2">
                          <Badge variant="outline">{item.wine.color}</Badge>
                          {item.wine.grape_varieties && (
                            <Badge variant="secondary">{item.wine.grape_varieties}</Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No items in this reservation. Click "Add Item" to add wines.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reservation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Reservation Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reservation ID:</span>
                  <span className="font-mono">{reservation.id.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer:</span>
                  <span className="font-mono">{reservation.user_id?.substring(0, 8)}...</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span>{formatDate(reservation.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items:</span>
                  <span>{items.length} wine{items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatPrice(calculateTotalCost())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                View Timeline
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <DollarSign className="w-4 h-4 mr-2" />
                Generate Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
