"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
} from "lucide-react";

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReservations, setSelectedReservations] = useState<string[]>(
    [],
  );
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      console.log("Fetching reservations...");
      const reservationsResponse = await fetch("/api/admin/reservations");

      if (!reservationsResponse.ok) {
        throw new Error(`HTTP error! status: ${reservationsResponse.status}`);
      }

      const reservationsData = await reservationsResponse.json();
      console.log(
        "Fetched reservations:",
        reservationsData.reservations?.length || 0,
      );

      setReservations(reservationsData.reservations || []);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
      alert("Failed to fetch reservations. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReservations(
        reservations.map((reservation) => reservation.id),
      );
    } else {
      setSelectedReservations([]);
    }
  };

  const handleSelectReservation = (reservationId: string, checked: boolean) => {
    if (checked) {
      setSelectedReservations((prev) => [...prev, reservationId]);
    } else {
      setSelectedReservations((prev) =>
        prev.filter((id) => id !== reservationId),
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedReservations.length === 0) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedReservations.length} reservation(s)? This will also delete all associated bookings and reservation items. This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      console.log("Deleting reservations:", selectedReservations);

      const response = await fetch("/api/admin/reservations", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reservationIds: selectedReservations }),
      });

      const result = await response.json();
      console.log("Delete response:", result);

      if (response.ok) {
        setSelectedReservations([]);
        setLoading(true); // Show loading state
        await fetchReservations(); // Refresh data

        const deletedCount = result.deletedCount || selectedReservations.length;
        const remainingCount = result.remainingCount || 0;

        alert(
          `Successfully deleted ${deletedCount} reservation(s). ${remainingCount} reservations remaining.`,
        );
      } else {
        console.error("Delete failed:", result);
        alert(
          `Failed to delete reservations: ${result.error || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error deleting reservations:", error);
      alert("Failed to delete reservations");
    }
  };

  const filteredReservations = reservations.filter((reservation) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      reservation.order_id?.toLowerCase().includes(searchLower) ||
      reservation.profiles?.email?.toLowerCase().includes(searchLower) ||
      reservation.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      reservation.status?.toLowerCase().includes(searchLower)
    );
  });

  const handleRowClick = (reservation: any) => {
    // Navigate to order details using reservation's order_id
    const orderId = reservation.order_id;
    if (orderId) {
      router.push(`/admin/orders/${orderId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage customer order reservations (these block zone deletion)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedReservations.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedReservations.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              fetchReservations();
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            Refresh
          </Button>
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
                  Total Reservations
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {reservations.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Order reservations
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
                  Placed Orders
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {reservations.filter((r) => r.status === "placed").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirmed orders
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Orders
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {reservations.filter((r) => r.status !== "placed").length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting confirmation
                </p>
              </div>
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Reservations</CardTitle>
              <CardDescription>
                Complete list of all order reservations (these prevent zone
                deletion)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reservations..."
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
              <p className="mt-2 text-gray-500">Loading reservations...</p>
            </div>
          ) : filteredReservations && filteredReservations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-sm text-gray-600">
                      <Checkbox
                        checked={
                          selectedReservations.length ===
                            filteredReservations.length &&
                          filteredReservations.length > 0
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Order ID
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Date
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Customer
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Total (Cost)
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Payment Status
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Fulfillment Status
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Delivery Zone
                    </th>
                    <th className="text-left p-2 text-xs font-medium text-gray-600">
                      Pickup Zone
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(reservation)}
                >
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedReservations.includes(
                            reservation.id,
                          )}
                          onCheckedChange={(checked) =>
                            handleSelectReservation(
                              reservation.id,
                              checked as boolean,
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-xs text-gray-600">
                          {reservation.order_id?.substring(0, 8) || reservation.id?.substring(0, 8) || "N/A"}
                        </div>
                      </td>
                      <td className="p-2 text-xs text-gray-500">
                        {new Date(reservation.created_at).toLocaleDateString("sv-SE")}
                      </td>
                      <td className="p-2">
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">
                            {reservation.profiles?.full_name || 
                             reservation.profiles?.email || 
                             "Unknown"}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[120px]">
                            {reservation.profiles?.email}
                          </div>
                        </div>
                      </td>
                      <td className="p-2 text-xs text-gray-500">
                        N/A
                      </td>
                      <td className="p-2">
                        <Badge
                          variant="secondary"
                          className={
                            reservation.payment_status === "paid"
                              ? "bg-green-100 text-green-800 text-xs"
                              : reservation.payment_status === "pending"
                                ? "bg-yellow-100 text-yellow-800 text-xs"
                                : "bg-red-100 text-red-800 text-xs"
                          }
                        >
                          {reservation.payment_status || "Pending"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <Badge
                          variant="secondary"
                          className={
                            reservation.fulfillment_status === "fulfilled"
                              ? "bg-green-100 text-green-800 text-xs"
                              : reservation.fulfillment_status === "processing"
                                ? "bg-blue-100 text-blue-800 text-xs"
                                : "bg-gray-100 text-gray-800 text-xs"
                          }
                        >
                          {reservation.fulfillment_status || "Pending"}
                        </Badge>
                      </td>
                      <td className="p-2 text-xs text-gray-900">
                        {reservation.delivery_zone_id
                          ? `Zone ${reservation.delivery_zone_id}`
                          : "None"}
                      </td>
                      <td className="p-2 text-xs text-gray-900">
                        {reservation.pickup_zone_id
                          ? `Zone ${reservation.pickup_zone_id}`
                          : "None"}
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
                No reservations found
              </h3>
              <p className="text-gray-500">
                When customers place orders, reservations will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
