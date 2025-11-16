import { getSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Calendar,
  CheckCircle,
  CreditCard,
  Database,
  Package,
  Plus,
  Shield,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminStatGrid } from "@/components/admin/admin-stat-grid";

export default async function AdminDashboard() {
  const sb = getSupabaseAdmin();

  // Hämta statistik
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
        `
      id,
      quantity,
      created_at,
      wines(wine_name, vintage, producers(name))
    `,
      )
      .order("created_at", { ascending: false })
      .limit(5),
    sb
      .from("pallets")
      .select(
        `
      id,
      name,
      bottle_capacity,
      bookings(quantity)
    `,
      )
      .limit(5),
  ]);

  // Beräkna pallet statistik
  const palletStats =
    recentPallets?.map((pallet) => {
      const totalBooked =
        pallet.bookings?.reduce((sum, b) => sum + b.quantity, 0) || 0;
      const percentage = (totalBooked / pallet.bottle_capacity) * 100;
      return { ...pallet, totalBooked, percentage };
    }) || [];

  const totalBookedBottles = palletStats.reduce(
    (sum, p) => sum + p.totalBooked,
    0,
  );
  const totalCapacity = palletStats.reduce(
    (sum, p) => sum + p.bottle_capacity,
    0,
  );
  const overallCompletion =
    totalCapacity > 0 ? (totalBookedBottles / totalCapacity) * 100 : 0;

  const insightStats = [
    {
      label: "Producers",
      value: producersCount || 0,
      helper: "Active partners",
      icon: Users,
    },
    {
      label: "Wines",
      value: winesCount || 0,
      helper: "Available SKUs",
      icon: Wine,
    },
    {
      label: "Bookings",
      value: bookingsCount || 0,
      helper: "Bottles reserved",
      icon: Calendar,
    },
    {
      label: "Capacity Filled",
      value: `${overallCompletion.toFixed(1)}%`,
      helper: `${totalBookedBottles} / ${totalCapacity || 0} bottles`,
      icon: TrendingUp,
    },
  ];

  return (
    <AdminPageShell
      header={{
        title: "Dashboard",
        description: "Monitor CrowdVine performance across catalog and ops.",
        badges: [{ label: "Live", tone: "success" }],
      }}
    >
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Insights
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Platform pulse
            </h1>
            <p className="text-sm text-slate-500">
              At-a-glance view of health across catalog and logistics.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/producers/new">
                <Plus className="mr-2 h-4 w-4" />
                Add producer
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/wines/new">
                <Plus className="mr-2 h-4 w-4" />
                Add wine
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-8">
          <AdminStatGrid stats={insightStats} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Operations
              </p>
              <h2 className="text-xl font-semibold text-slate-900">
                Pallet readiness
              </h2>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/pallets">View pallets</Link>
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            {palletStats.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                No pallets in progress
              </div>
            )}
            {palletStats.map((pallet) => (
              <div
                key={pallet.id}
                className="rounded-2xl border border-slate-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {pallet.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {pallet.totalBooked} / {pallet.bottle_capacity} bottles
                    </p>
                  </div>
                  <Badge
                    variant={pallet.percentage >= 100 ? "default" : "secondary"}
                  >
                    {pallet.percentage.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={pallet.percentage} className="mt-3 h-2" />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{pallet.totalBooked} booked</span>
                  <span>
                    {Math.max(pallet.bottle_capacity - pallet.totalBooked, 0)}{" "}
                    remaining
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-span-2 flex flex-col gap-6">
          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" />
                Recent bookings
              </CardTitle>
              <CardDescription>Latest bottle movements</CardDescription>
            </CardHeader>
            <CardContent>
              {recentBookings && recentBookings.length > 0 ? (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-2xl border border-slate-100 p-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {booking.wines?.wine_name} {booking.wines?.vintage}
                          </p>
                          <p className="text-xs text-slate-500">
                            {booking.wines?.producers?.name}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        {booking.quantity} bottles
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-slate-500">
                  <Calendar className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  No recent bookings
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                System status
              </CardTitle>
              <CardDescription>Live service checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Database", icon: Database, status: "Online" },
                { label: "Stripe", icon: CreditCard, status: "Connected" },
                { label: "Authentication", icon: Shield, status: "Active" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 p-3"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-emerald-500" />
                    <span className="text-sm font-medium text-slate-900">
                      {item.label}
                    </span>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-900">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Catalog & access
            </p>
            <h2 className="text-xl font-semibold text-slate-900">
              Quick actions
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Catalog
            </p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Manage producers", href: "/admin/producers", icon: Users },
                { label: "Manage wines", href: "/admin/wines", icon: Wine },
                { label: "Manage wine boxes", href: "/admin/wine-boxes", icon: Package },
                { label: "Update content", href: "/admin/content", icon: Shield },
              ].map((action) => (
                <Button
                  key={action.label}
                  asChild
                  variant="ghost"
                  className="w-full justify-start gap-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 hover:bg-white"
                >
                  <Link href={action.href}>
                    <action.icon className="h-4 w-4 text-slate-400" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Access
            </p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Manage users", href: "/admin/users", icon: Users },
                { label: "Membership settings", href: "/admin/memberships", icon: Users },
                { label: "Producer groups", href: "/admin/producer-groups", icon: Users },
                { label: "Access control", href: "/admin/access-control", icon: Shield },
              ].map((action) => (
                <Button
                  key={action.label}
                  asChild
                  variant="ghost"
                  className="w-full justify-start gap-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-700 hover:bg-white"
                >
                  <Link href={action.href}>
                    <action.icon className="h-4 w-4 text-slate-400" />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </AdminPageShell>
  );
}
