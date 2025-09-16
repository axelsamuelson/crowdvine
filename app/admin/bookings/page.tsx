"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Wine,
  Users,
  Package,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [bookingsWithReservationInfo, setBookingsWithReservationInfo] =
    useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // Fetch bookings
      const bookingsResponse = await fetch("/api/admin/bookings");
      const bookingsData = await bookingsResponse.json();
      setBookings(bookingsData.bookings || []);
      setReservations(bookingsData.reservations || []);

      // Koppla bookings till reservations baserat på user_id och datum
      const bookingsWithReservationInfo =
        bookingsData.bookings?.map((booking: any) => {
          const matchingReservation = bookingsData.reservations?.find(
            (reservation: any) =>
              reservation.user_id === booking.user_id &&
              Math.abs(
                new Date(reservation.created_at).getTime() -
                  new Date(booking.created_at).getTime(),
              ) <
                24 * 60 * 60 * 1000,
          );

          return {
            ...booking,
            reservation: matchingReservation,
          };
        }) || [];

      setBookingsWithReservationInfo(bookingsWithReservationInfo);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Beräkna statistik
  const totalBookings = bookings?.length || 0;
  const totalBottles = bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
  const totalValue =
    bookings?.reduce(
      (sum, b) => sum + b.quantity * (b.wines?.base_price_cents || 0),
      0,
    ) || 0;

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(priceCents / 100);
  };

  const getStatusColor = (booking: any) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(booking.created_at).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    if (daysSinceCreated < 1) return "bg-green-100 text-green-800";
    if (daysSinceCreated < 7) return "bg-blue-100 text-blue-800";
    return "bg-gray-100 text-gray-800";
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedBookings(
        bookingsWithReservationInfo.map((booking) => booking.id),
      );
    } else {
      setSelectedBookings([]);
    }
  };

  const handleSelectBooking = (bookingId: string, checked: boolean) => {
    if (checked) {
      setSelectedBookings((prev) => [...prev, bookingId]);
    } else {
      setSelectedBookings((prev) => prev.filter((id) => id !== bookingId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBookings.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedBookings.length} booking(s)? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/bookings", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bookingIds: selectedBookings }),
      });

      if (response.ok) {
        setSelectedBookings([]);
        fetchBookings(); // Refresh data
      } else {
        alert("Failed to delete bookings");
      }
    } catch (error) {
      console.error("Error deleting bookings:", error);
      alert("Failed to delete bookings");
    }
  };

  const filteredBookings = bookingsWithReservationInfo.filter((booking) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.wines?.wine_name?.toLowerCase().includes(searchLower) ||
      booking.wines?.producers?.name?.toLowerCase().includes(searchLower) ||
      booking.reservation?.profiles?.email
        ?.toLowerCase()
        .includes(searchLower) ||
      booking.reservation?.id?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer wine reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBookings.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedBookings.length})
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalBookings}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Individual reservations
                </p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Bottles
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalBottles}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bottles reserved
                </p>
              </div>
              <Wine className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Value
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatPrice(totalValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Estimated value
                </p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Bookings</CardTitle>
              <CardDescription>
                Complete list of all wine reservations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading bookings...</p>
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      <Checkbox
                        checked={
                          selectedBookings.length === filteredBookings.length &&
                          filteredBookings.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Order ID
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Customer
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Status
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Wine
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Producer
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Pallet
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Quantity
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Price Band
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Value
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Date
                    </th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <Checkbox
                          checked={selectedBookings.includes(booking.id)}
                          onCheckedChange={(checked) =>
                            handleSelectBooking(booking.id, checked as boolean)
                          }
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-sm text-gray-600">
                          {booking.reservation?.id?.substring(0, 8) || "N/A"}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.reservation?.profiles?.email || "Unknown"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.reservation?.profiles?.role || "Customer"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={
                            booking.reservation?.status === "placed"
                              ? "bg-blue-100 text-blue-800"
                              : booking.reservation?.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                          }
                        >
                          {booking.reservation?.status ||
                            booking.status ||
                            "Unknown"}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {booking.wines?.wine_name} {booking.wines?.vintage}
                          </div>
                          <div className="text-sm text-gray-500">
                            {booking.wines?.grape_varieties}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-900">
                        {booking.wines?.producers?.name}
                      </td>
                      <td className="p-3 text-gray-900">
                        {booking.pallets?.name || "No Pallet Assigned"}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          {booking.quantity} bottles
                        </Badge>
                      </td>
                      <td className="p-3 text-gray-900">{booking.band}</td>
                      <td className="p-3 font-medium text-gray-900">
                        {formatPrice(
                          (booking.wines?.base_price_cents || 0) *
                            booking.quantity,
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" className="text-xs">
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                No bookings found
              </h3>
              <p className="text-gray-500">
                When customers make reservations, they will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
