"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Wine,
  DollarSign,
  Search,
  Download,
  MoreHorizontal,
  Trash2,
  ArrowRight,
} from "lucide-react";

export default function BookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "dirty-wine" ? "dirty-wine" : "pact";

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

  useEffect(() => {
    if (initialTab === "dirty-wine") {
      router.replace("/admin/bookings/dirty-wine");
    }
  }, [initialTab, router]);

  const fetchBookings = async () => {
    try {
      // Fetch bookings
      const bookingsResponse = await fetch("/api/admin/bookings");
      const bookingsData = await bookingsResponse.json();

      console.log("📦 [Bookings Page] Received data:", {
        bookingsCount: bookingsData.bookings?.length || 0,
        reservationsCount: bookingsData.reservations?.length || 0,
        sampleBooking: bookingsData.bookings?.[0],
        sampleReservation: bookingsData.reservations?.[0],
      });

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
            reservation: matchingReservation || {
              id: booking.user_id, // Use user_id as fallback
              order_id: booking.id, // Use booking ID as fallback order ID
              status: booking.status || "reserved",
              created_at: booking.created_at,
              user_id: booking.user_id,
              payment_status: "pending",
              fulfillment_status: "pending",
              profiles: booking.profiles || {
                email: `user-${booking.user_id.substring(0, 8)}`,
                full_name: "Unknown Customer",
              },
            },
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
      booking.reservation?.profiles?.full_name
        ?.toLowerCase()
        .includes(searchLower) ||
      booking.reservation?.order_id?.toLowerCase().includes(searchLower)
    );
  });

  const handleRowClick = (booking: any) => {
    // Navigate to order details using reservation's order_id
    const orderId = booking.reservation?.order_id;
    if (orderId) {
      router.push(`/admin/orders/${orderId}`);
    }
  };

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value === "dirty-wine" ? "dirty-wine" : "pact");
    url.searchParams.delete("_");
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Bookings
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Manage customer wine reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedBookings.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="rounded-lg text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete ({selectedBookings.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/50"
          >
            <Download className="h-3.5 w-3.5 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/50"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs value={initialTab} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1">
          <TabsTrigger
            value="pact"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            PACT
          </TabsTrigger>
          <TabsTrigger value="dirty-wine" asChild>
            <Link
              href="/admin/bookings/dirty-wine"
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium px-4 py-2"
            >
              Dirty Wine
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pact" className="mt-6 space-y-6">
          {/* Summary Stats – dashboard card style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                label: "Total Bookings",
                value: String(totalBookings),
                sub: "Individual reservations",
                icon: Calendar,
                iconBg: "text-blue-600 dark:text-blue-400",
              },
              {
                label: "Total Bottles",
                value: String(totalBottles),
                sub: "Bottles reserved",
                icon: Wine,
                iconBg: "text-purple-600 dark:text-purple-400",
              },
              {
                label: "Total Value",
                value: formatPrice(totalValue),
                sub: "Estimated value",
                icon: DollarSign,
                iconBg: "text-emerald-600 dark:text-emerald-400",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
                    <stat.icon
                      className={`w-4 h-4 ${stat.iconBg}`}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50 mt-0.5">
                  {stat.value}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                  {stat.sub}
                </p>
              </div>
            ))}
          </div>

          {/* Bookings Table – dashboard card + inner box */}
          <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
              All Bookings
            </h2>
            <div className="flex items-center justify-between gap-4 mb-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Complete list of all wine reservations
              </p>
              <div className="relative flex items-center gap-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-zinc-100 focus:ring-offset-0 placeholder:text-gray-500 dark:placeholder:text-zinc-400 w-48"
                />
              </div>
            </div>
            <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-zinc-100 mx-auto" />
                  <p className="mt-2 text-xs text-gray-500 dark:text-zinc-400">
                    Loading bookings...
                  </p>
                </div>
              ) : filteredBookings && filteredBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-zinc-800">
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          <Checkbox
                            checked={
                              selectedBookings.length === filteredBookings.length &&
                              filteredBookings.length > 0
                            }
                            onCheckedChange={handleSelectAll}
                          />
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Order ID
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Date
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Customer
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Total
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Payment
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Fulfillment
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Wine
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Producer
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Qty
                        </th>
                        <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                          Pallet
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((booking) => (
                        <tr
                          key={booking.id}
                          className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                          onClick={() => handleRowClick(booking)}
                        >
                          <td
                            className="p-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedBookings.includes(booking.id)}
                              onCheckedChange={(checked) =>
                                handleSelectBooking(
                                  booking.id,
                                  checked as boolean,
                                )
                              }
                            />
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-900 dark:text-zinc-100">
                            {booking.reservation?.order_id?.substring(0, 8) ||
                              booking.id?.substring(0, 8) ||
                              "N/A"}
                          </td>
                          <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                            {new Date(booking.created_at).toLocaleDateString(
                              "sv-SE",
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-xs">
                              <div className="font-medium text-gray-900 dark:text-zinc-100">
                                {booking.profiles?.full_name ||
                                  booking.reservation?.profiles?.full_name ||
                                  booking.profiles?.email ||
                                  booking.reservation?.profiles?.email ||
                                  `User ${booking.user_id?.substring(0, 8)}` ||
                                  "Unknown"}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[120px]">
                                {booking.profiles?.email ||
                                  booking.reservation?.profiles?.email}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-xs font-medium text-gray-900 dark:text-zinc-100">
                            {formatPrice(
                              (booking.wines?.base_price_cents || 0) *
                                booking.quantity,
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                booking.reservation?.payment_status === "paid"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : booking.reservation?.payment_status ===
                                      "pending"
                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              }`}
                            >
                              {booking.reservation?.payment_status || "Pending"}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                booking.reservation?.fulfillment_status ===
                                "fulfilled"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                  : booking.reservation?.fulfillment_status ===
                                      "processing"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-400"
                              }`}
                            >
                              {booking.reservation?.fulfillment_status ||
                                "Pending"}
                            </span>
                          </td>
                          <td className="p-3 text-xs font-medium text-gray-900 dark:text-zinc-100">
                            {booking.wines?.wine_name} {booking.wines?.vintage}
                          </td>
                          <td className="p-3 text-xs text-gray-900 dark:text-zinc-100">
                            {booking.wines?.producers?.name}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {booking.quantity}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-gray-900 dark:text-zinc-100">
                            {booking.pallets?.name || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <Calendar className="h-14 w-14 mx-auto mb-4 text-gray-400 dark:text-zinc-500" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                    No bookings found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                    When customers make reservations, they will appear here.
                  </p>
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 mt-4 py-2 px-3 rounded-lg text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    Back to dashboard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
