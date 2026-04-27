import { getSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import {
  Users,
  Wine,
  Calendar,
  MapPin,
  Package,
  Wallet,
  CreditCard,
  Shield,
  FileText,
  Sparkles,
  ArrowRight,
  Plus,
  CheckCircle,
} from "lucide-react";

export default async function AdminDashboard() {
  const sb = getSupabaseAdmin();

  const [
    { count: producersCount },
    { count: winesCount },
    { count: bookingsCount },
    { count: zonesCount },
    { count: palletsCount },
    { data: recentBookings },
    { data: recentPallets },
  ] = await Promise.all([
    sb.from("producers").select("*", { count: "exact", head: true }),
    sb.from("wines").select("*", { count: "exact", head: true }),
    sb.from("bookings").select("*", { count: "exact", head: true }),
    sb.from("pallet_zones").select("*", { count: "exact", head: true }),
    sb.from("pallets").select("*", { count: "exact", head: true }),
    sb
      .from("bookings")
      .select(
        `id, quantity, created_at, wines(wine_name, vintage, producers(name))`,
      )
      .order("created_at", { ascending: false })
      .limit(6),
    sb
      .from("pallets")
      .select(`id, name, bottle_capacity, bookings(quantity)`)
      .limit(5),
  ]);

  const palletStats =
    recentPallets?.map((pallet) => {
      const totalBooked =
        pallet.bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
      const percentage = (totalBooked / pallet.bottle_capacity) * 100;
      return { ...pallet, totalBooked, percentage };
    }) || [];

  const totalBookedBottles = palletStats.reduce((s, p) => s + p.totalBooked, 0);
  const totalCapacity = palletStats.reduce((s, p) => s + p.bottle_capacity, 0);
  const overallCompletion =
    totalCapacity > 0 ? (totalBookedBottles / totalCapacity) * 100 : 0;

  const statsRows = [
    { label: "Producers", value: String(producersCount ?? 0), icon: Users },
    { label: "Wines", value: String(winesCount ?? 0), icon: Wine },
    { label: "Bookings", value: String(bookingsCount ?? 0), icon: Calendar },
    { label: "Zones", value: String(zonesCount ?? 0), icon: MapPin },
    { label: "Pallets", value: String(palletsCount ?? 0), icon: Package },
  ];

  return (
    <div className="space-y-4">
      {/* Row 1: Two cards – Platform overview (List01-style) + Recent Bookings (List02-style) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Platform overview – template List01 style */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Platform overview
          </h2>
          <div className="flex-1">
            <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
                <p className="text-xs text-gray-600 dark:text-zinc-400">
                  Total bookings
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
                  {bookingsCount ?? 0}
                </p>
              </div>
              <div className="p-3">
                <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 mb-2">
                  Entities
                </p>
                <div className="space-y-1">
                  {statsRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800">
                          <row.icon className="w-3.5 h-3.5 text-gray-700 dark:text-zinc-200" />
                        </div>
                        <span className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                          {row.label}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-900 dark:text-zinc-100">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
                <Link
                  href="/admin/producers/new"
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Producer
                </Link>
                <Link
                  href="/admin/wines/new"
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Wine
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Bookings – template List02 style */}
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
            Recent Bookings
          </h2>
          <div className="flex-1">
            <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Recent activity
                  <span className="text-xs font-normal text-gray-500 dark:text-zinc-400 ml-1">
                    ({recentBookings?.length ?? 0} shown)
                  </span>
                </h3>
                <span className="text-xs text-gray-500 dark:text-zinc-400">
                  Latest
                </span>
              </div>
              <div className="p-2 space-y-1 max-h-[280px] overflow-y-auto">
                {recentBookings && recentBookings.length > 0 ? (
                  recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
                        <Wine className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">
                          {booking.wines?.wine_name} {booking.wines?.vintage}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pl-2">
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          +{booking.quantity}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                          bottles
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-zinc-400 text-sm">
                    No recent bookings
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-gray-100 dark:border-zinc-800">
                <Link
                  href="/admin/b2c-orders"
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                >
                  View all B2C orders
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Full width – Upcoming Events style (horizontal scroll: pallets + quick actions) */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Pallets & Quick actions
        </h2>
        <div className="w-full overflow-x-auto scrollbar-none">
          <div className="flex gap-3 min-w-max p-1">
            {/* Pallet cards – List03 style */}
            {palletStats.map((pallet) => (
              <div
                key={pallet.id}
                className="flex flex-col w-[260px] shrink-0 bg-gray-50 dark:bg-zinc-900/70 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 transition-all shadow-sm"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800">
                      <Package className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        pallet.percentage >= 100
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {pallet.percentage.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mb-1">
                      {pallet.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {pallet.totalBooked} / {pallet.bottle_capacity} bottles
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-zinc-400">
                        Progress
                      </span>
                      <span className="text-gray-900 dark:text-zinc-100">
                        {pallet.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gray-900 dark:bg-zinc-100 rounded-full"
                        style={{ width: `${Math.min(100, pallet.percentage)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-auto border-t border-gray-100 dark:border-zinc-800">
                  <Link
                    href="/admin/pallets"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    View pallets
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
            {/* System status + Quick action cards */}
            <div className="flex flex-col w-[260px] shrink-0 bg-gray-50 dark:bg-zinc-900/70 rounded-xl border border-gray-100 dark:border-zinc-800">
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    System status
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">
                      Database
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-zinc-400">
                      Completion
                    </span>
                    <span className="text-gray-900 dark:text-zinc-100 font-medium">
                      {overallCompletion.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto border-t border-gray-100 dark:border-zinc-800">
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
            {/* Quick action cards */}
            {[
              { href: "/admin/producers", label: "Producers", icon: Users },
              { href: "/admin/wines", label: "Wines", icon: Wine },
              { href: "/admin/b2c-orders", label: "B2C Orders", icon: Calendar },
              { href: "/admin/content", label: "Content", icon: FileText },
              { href: "/admin/menu-extraction", label: "Menyextraktion", icon: Sparkles },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col w-[260px] shrink-0 bg-gray-50 dark:bg-zinc-900/70 rounded-xl border border-gray-100 dark:border-zinc-800 hover:border-gray-200 dark:hover:border-zinc-700 transition-all shadow-sm group"
              >
                <div className="p-4 flex-1">
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-zinc-800 w-fit">
                    <action.icon className="w-4 h-4 text-gray-700 dark:text-zinc-100" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-zinc-100 mt-3">
                    {action.label}
                  </h3>
                </div>
                <div className="border-t border-gray-100 dark:border-zinc-800">
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-100 group-hover:bg-gray-100 dark:group-hover:bg-zinc-800/50 transition-colors">
                    View
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
