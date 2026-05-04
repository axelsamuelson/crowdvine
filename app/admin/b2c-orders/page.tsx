"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Clock,
  CheckCircle,
  Search,
  Download,
  MoreHorizontal,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface AdminReservationListRow {
  id: string;
  created_at: string;
  user_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  delivery_zone_id?: string | null;
  pickup_zone_id?: string | null;
  shipping_region_id?: string | null;
  shipping_region_name?: string | null;
  delivery_zone_name?: string | null;
  total_sek?: number | null;
  total_bottles?: number | null;
  payment_mode?: string | null;
  checkout_group_id?: string | null;
  cart_id?: string | null;
  pallet_id?: string | null;
  pallet?: { id: string; name: string | null } | null;
  market_code?: string | null;
  country_code?: string | null;
  region?: string | null;
  is_conditional?: boolean | null;
  charge_blocked_reason?: string | null;
  profiles?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
}

function formatPaymentStatus(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Awaiting payment";
    case "failed":
      return "Payment failed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Not charged yet";
  }
}

function paymentBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400";
    case "pending":
      return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    case "failed":
    case "expired":
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "cancelled":
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-400";
    default:
      return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-400";
  }
}

function formatReservationStatus(status: string | null | undefined): string {
  switch (status) {
    case "pending_producer_approval":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "partly_approved":
      return "Partly approved";
    case "placed":
      return "Placed";
    case "confirmed":
      return "Confirmed";
    case "pending_payment":
      return "Pending payment";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    case "conditional_pending":
      return "US conditional (pending review)";
    default:
      return status ?? "—";
  }
}

export default function B2cOrdersPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<AdminReservationListRow[]>(
    [],
  );
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
        "📋 [B2C Orders Page] Fetched reservations:",
        reservationsData.reservations?.length || 0,
      );
      console.log(
        "📋 [B2C Orders Page] Sample reservation:",
        reservationsData.reservations?.[0],
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
      reservation.user_id?.toLowerCase().includes(searchLower) ||
      (reservation.status?.toLowerCase()?.includes(searchLower) ?? false) ||
      (reservation.market_code?.toLowerCase()?.includes(searchLower) ?? false) ||
      (reservation.country_code?.toLowerCase()?.includes(searchLower) ?? false) ||
      (reservation.region?.toLowerCase()?.includes(searchLower) ?? false) ||
      (reservation.charge_blocked_reason
        ?.toLowerCase()
        ?.includes(searchLower) ?? false)
    );
  });

  const handleRowClick = (reservation: AdminReservationListRow) => {
    router.push(`/admin/b2c-orders/${reservation.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            B2C Orders
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Manage customer order reservations (these block zone deletion)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedReservations.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="rounded-lg text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
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
            className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/50"
          >
            <Search className="h-3.5 w-3.5 mr-2" />
            Refresh
          </Button>
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

      {/* Summary Stats – dashboard card style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: "Total Reservations",
            value: String(reservations.length),
            sub: "Order reservations",
            icon: Calendar,
            iconBg: "text-blue-600 dark:text-blue-400",
          },
          {
            label: "Placed Orders",
            value: String(
              reservations.filter((r) => r.status === "placed").length,
            ),
            sub: "Confirmed orders",
            icon: CheckCircle,
            iconBg: "text-emerald-600 dark:text-emerald-400",
          },
          {
            label: "Pending Orders",
            value: String(
              reservations.filter((r) => r.status !== "placed").length,
            ),
            sub: "Awaiting confirmation",
            icon: Clock,
            iconBg: "text-amber-600 dark:text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
                <stat.icon className={`w-4 h-4 ${stat.iconBg}`} />
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

      {/* Reservations Table – dashboard card + inner box */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          All Reservations
        </h2>
        <div className="flex items-center justify-between gap-4 mb-4">
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            Order reservations (these prevent zone deletion)
          </p>
          <div className="relative flex items-center gap-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-zinc-400" />
            <input
              type="text"
              placeholder="Search reservations..."
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
                Loading reservations...
              </p>
            </div>
          ) : filteredReservations && filteredReservations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-zinc-800">
                    <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                      <Checkbox
                        checked={
                          selectedReservations.length ===
                            filteredReservations.length &&
                          filteredReservations.length > 0
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
                      Bottles
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Payment
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Order Status
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Delivery
                    </th>
                    <th className="text-left p-3 text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Pickup
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(reservation)}
                    >
                      <td
                        className="p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                      <td className="p-3 font-mono text-xs text-gray-900 dark:text-zinc-100">
                        {reservation.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                        {new Date(reservation.created_at).toLocaleDateString(
                          "sv-SE",
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-xs">
                          <div className="font-medium text-gray-900 dark:text-zinc-100">
                            {reservation.profiles?.full_name ||
                              reservation.profiles?.email ||
                              `User ${reservation.user_id?.substring(0, 8)}` ||
                              "Unknown"}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-[120px]">
                            {reservation.profiles?.email ||
                              `ID: ${reservation.user_id}`}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-500 dark:text-zinc-400">
                        {typeof reservation.total_sek === "number"
                          ? `${Math.round(reservation.total_sek)} kr`
                          : "—"}
                      </td>
                      <td className="p-3 text-xs text-gray-500 dark:text-zinc-400 tabular-nums">
                        {typeof reservation.total_bottles === "number"
                          ? reservation.total_bottles
                          : "—"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            paymentBadgeClass(reservation.payment_status)
                          }`}
                        >
                          {formatPaymentStatus(reservation.payment_status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-400">
                            {formatReservationStatus(reservation.status)}
                          </span>
                          {reservation.is_conditional === true ||
                          reservation.market_code === "US" ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">
                              US conditional
                            </span>
                          ) : null}
                          {reservation.charge_blocked_reason ? (
                            <span
                              className="text-[10px] text-amber-800 dark:text-amber-200 max-w-[200px] leading-tight"
                              title={reservation.charge_blocked_reason}
                            >
                              Charge hold: {reservation.charge_blocked_reason}
                            </span>
                          ) : null}
                          {reservation.country_code || reservation.region ? (
                            <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-mono">
                              {[reservation.country_code, reservation.region]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-900 dark:text-zinc-100">
                        {reservation.delivery_zone_name ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-gray-900 dark:text-zinc-100">
                        {reservation.shipping_region_name ??
                          reservation.pallet?.name ??
                          "—"}
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
                No reservations found
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mx-auto">
                When customers place orders, reservations will appear here.
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
    </div>
  );
}
