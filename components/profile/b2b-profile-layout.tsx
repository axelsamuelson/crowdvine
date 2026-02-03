"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IPTimeline } from "@/components/membership/ip-timeline";
import {
  User,
  LayoutDashboard,
  Package,
  Activity,
  LogOut,
  Phone,
  Calendar,
  Settings,
  MapPin,
  ShoppingCart,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

interface MembershipData {
  membership: { level: string; impactPoints: number };
  levelInfo: { name: string };
}

type B2BSection = "overview" | "orders" | "activity";

interface B2BProfileLayoutProps {
  profile: UserProfile;
  membershipData: MembershipData;
  reservations: any[];
  ipEvents: any[];
}

export function B2BProfileLayout({
  profile,
  membershipData,
  reservations,
  ipEvents,
}: B2BProfileLayoutProps) {
  const router = useRouter();
  const [section, setSection] = useState<B2BSection>("overview");

  const userName = profile?.full_name || "Kontakt";
  const totalBottles = reservations.reduce(
    (sum, r) =>
      sum +
      (r.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0),
    0,
  );
  const uniquePallets = new Set(
    reservations.map((r) => r.pallet_id).filter(Boolean),
  ).size;

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  };

  const mostOrderedMap = new Map<string, any>();
  for (const r of reservations) {
    for (const it of r.items || []) {
      const key = `${it.wine_name || ""}|${it.vintage || ""}|${it.producer_name || ""}`;
      const prev = mostOrderedMap.get(key);
      if (prev) prev.quantity += it.quantity || 0;
      else
        mostOrderedMap.set(key, {
          wine_name: it.wine_name,
          vintage: it.vintage,
          producer_name: it.producer_name,
          color: it.color,
          image_path: it.image_path,
          quantity: it.quantity || 0,
        });
    }
  }
  const mostOrderedList = Array.from(mostOrderedMap.values()).sort(
    (a, b) => (b.quantity || 0) - (a.quantity || 0),
  );

  const hasAddress =
    profile?.address || profile?.city || profile?.postal_code || profile?.country;
  const addressLines = [
    profile?.address,
    [profile?.postal_code, profile?.city].filter(Boolean).join(" "),
    profile?.country,
  ].filter(Boolean);
  const addressDisplay = addressLines.join("\n");

  return (
    <PageLayout>
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-background/95 px-3 py-3 sm:gap-3 sm:px-4 md:h-14 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:min-w-0 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {userName}
              </h1>
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{profile.email}</p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
              {profile.phone && (
                <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:inline-flex">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[120px] md:max-w-none">{profile.phone}</span>
                </span>
              )}
              <Link
                href="/profile/edit"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md px-2 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Inställningar"
              >
                <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="sm:inline hidden">Inställningar</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md px-2 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-h-0 sm:min-w-0 sm:py-1.5"
                aria-label="Logga ut"
              >
                <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                <span className="sm:inline hidden">Logga ut</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6 md:px-8">
          <Tabs value={section} onValueChange={(v) => setSection(v as B2BSection)}>
            <TabsList className="w-full grid grid-cols-3 gap-0.5 p-0.5 sm:w-auto sm:inline-flex sm:gap-1 sm:p-1">
              <TabsTrigger value="overview" className="gap-1 py-2.5 text-xs sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                <span className="truncate">Översikt</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1 py-2.5 text-xs sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm">
                <Package className="h-4 w-4 shrink-0" />
                <span className="truncate">Ordrar</span>
                {reservations.length > 0 && (
                  <span className="ml-0.5 text-[10px] opacity-80 sm:ml-1 sm:text-xs">({reservations.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1 py-2.5 text-xs sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm">
                <Activity className="h-4 w-4 shrink-0" />
                <span className="truncate">Aktivitet</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
              <>
                <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-[11px] font-medium sm:text-xs">Antal flaskor</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground sm:text-2xl">{totalBottles}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-[11px] font-medium sm:text-xs">Aktiva ordrar</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground sm:text-2xl">{reservations.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                      <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-[11px] font-medium sm:text-xs">Pallar</span>
                    </div>
                    <p className="text-xl font-semibold text-foreground sm:text-2xl">{uniquePallets}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="text-[11px] font-medium sm:text-xs">Medlemskap</span>
                    </div>
                    <p className="truncate text-base font-semibold text-foreground sm:text-lg" title={membershipData?.levelInfo?.name}>
                      {membershipData?.levelInfo?.name || "—"}
                    </p>
                  </div>
                </section>

                <section className="space-y-3 sm:space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground sm:text-base">Senaste ordrar</h2>
                    {reservations.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSection("orders")}
                        className="h-9 text-muted-foreground hover:text-foreground"
                      >
                        Visa alla
                      </Button>
                    )}
                  </div>
                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    {reservations.length === 0 ? (
                      <div className="p-6 text-center sm:p-8 md:p-10">
                        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3 sm:mb-4 sm:h-12 sm:w-12">
                          <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">Inga ordrar ännu</h3>
                        <p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto sm:text-sm sm:mb-4">
                          Gå till sortimentet och lägg viner på din pall. När du är klar kan du slutföra beställningen härifrån.
                        </p>
                        <Button asChild size="sm" className="min-h-[44px] sm:min-h-0">
                          <Link href="/shop" className="inline-flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            Gå till sortiment
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="divide-y divide-border md:hidden">
                          {reservations.slice(0, 5).map((r: any) => {
                            const bottles = r.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
                            const cap = r.pallet_capacity || 0;
                            return (
                              <div key={r.id || r.order_id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-foreground truncate">{r.pallet_name || "Order"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {bottles} flaskor{cap ? ` · ${cap} platser` : ""}
                                  </p>
                                </div>
                                <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground shrink-0">
                                  {r.payment_status || r.status || "Pågående"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="hidden md:block">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-border">
                                <TableHead className="text-muted-foreground">Order / Pall</TableHead>
                                <TableHead className="text-muted-foreground">Flaskor</TableHead>
                                <TableHead className="text-muted-foreground">Kapacitet</TableHead>
                                <TableHead className="text-muted-foreground text-right">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {reservations.slice(0, 5).map((r: any) => {
                                const bottles = r.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
                                const cap = r.pallet_capacity || 0;
                                return (
                                  <TableRow key={r.id || r.order_id} className="border-border">
                                    <TableCell className="font-medium text-foreground">{r.pallet_name || "Order"}</TableCell>
                                    <TableCell className="text-muted-foreground">{bottles}</TableCell>
                                    <TableCell className="text-muted-foreground">{cap ? `${cap} platser` : "—"}</TableCell>
                                    <TableCell className="text-right">
                                      <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                        {r.payment_status || r.status || "Pågående"}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    )}
                  </div>
                </section>

                <section className="space-y-2 sm:space-y-3">
                  <h3 className="text-xs font-semibold text-foreground sm:text-sm">Leveransadress</h3>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    {hasAddress ? (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground sm:h-4 sm:w-4" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm text-foreground whitespace-pre-line">{addressDisplay}</p>
                          <Link
                            href="/profile/edit"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Settings className="h-3 w-3" />
                            Redigera adress
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground sm:h-4 sm:w-4" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-muted-foreground">Ingen leveransadress sparad.</p>
                          <Button asChild variant="outline" size="sm" className="mt-2 min-h-[44px] sm:min-h-0">
                            <Link href="/profile/edit" className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Lägg till adress
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {mostOrderedList.length > 0 && (
                  <section className="space-y-2 sm:space-y-3">
                    <h3 className="text-xs font-semibold text-foreground sm:text-sm">Mest beställda viner</h3>
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                      <ul className="space-y-2">
                        {mostOrderedList.slice(0, 8).map((w) => (
                          <li
                            key={`${w.wine_name}-${w.vintage}-${w.producer_name}`}
                            className="flex items-center justify-between gap-2 py-1.5 border-b border-border last:border-0 last:pb-0 first:pt-0 sm:gap-3"
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                              {w.image_path ? (
                                <img src={w.image_path} alt="" className="h-9 w-9 shrink-0 rounded-md border border-border object-cover sm:h-10 sm:w-10" />
                              ) : (
                                <div className="h-9 w-9 shrink-0 rounded-md border border-border bg-muted sm:h-10 sm:w-10" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-foreground sm:text-sm">
                                  {w.wine_name}
                                  {w.vintage ? ` ${w.vintage}` : ""}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{w.producer_name || "—"}</p>
                              </div>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-foreground sm:text-sm">×{w.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>
                )}
              </>
            </TabsContent>

            <TabsContent value="orders" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
              <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                    <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[11px] font-medium sm:text-xs">Antal flaskor</span>
                  </div>
                  <p className="text-xl font-semibold text-foreground sm:text-2xl">{totalBottles}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[11px] font-medium sm:text-xs">Aktiva ordrar</span>
                  </div>
                  <p className="text-xl font-semibold text-foreground sm:text-2xl">{reservations.length}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                    <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[11px] font-medium sm:text-xs">Pallar</span>
                  </div>
                  <p className="text-xl font-semibold text-foreground sm:text-2xl">{uniquePallets}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5 sm:mb-1 sm:gap-2">
                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="text-[11px] font-medium sm:text-xs">Medlemskap</span>
                  </div>
                  <p className="truncate text-base font-semibold text-foreground sm:text-lg" title={membershipData?.levelInfo?.name}>
                    {membershipData?.levelInfo?.name || "—"}
                  </p>
                </div>
              </section>
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">Alla ordrar</h2>
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  {reservations.length === 0 ? (
                    <div className="p-6 text-center sm:p-8 md:p-10">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3 sm:mb-4 sm:h-12 sm:w-12">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Inga ordrar ännu</h3>
                      <p className="text-xs text-muted-foreground mb-3 max-w-sm mx-auto sm:text-sm sm:mb-4">
                        Gå till sortimentet och lägg viner på din pall.
                      </p>
                      <Button asChild size="sm" className="min-h-[44px] sm:min-h-0">
                        <Link href="/shop" className="inline-flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" />
                          Gå till sortiment
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-border md:hidden">
                        {reservations.map((r: any) => {
                          const bottles = r.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
                          const cap = r.pallet_capacity || 0;
                          return (
                            <div key={r.id || r.order_id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground truncate">{r.pallet_name || "Order"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {bottles} flaskor{cap ? ` · ${cap} platser` : ""}
                                </p>
                              </div>
                              <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground shrink-0">
                                {r.payment_status || r.status || "Pågående"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border">
                              <TableHead className="text-muted-foreground">Order / Pall</TableHead>
                              <TableHead className="text-muted-foreground">Flaskor</TableHead>
                              <TableHead className="text-muted-foreground">Kapacitet</TableHead>
                              <TableHead className="text-muted-foreground text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reservations.map((r: any) => {
                              const bottles = r.items?.reduce((s: number, it: any) => s + (it.quantity || 0), 0) || 0;
                              const cap = r.pallet_capacity || 0;
                              return (
                                <TableRow key={r.id || r.order_id} className="border-border">
                                  <TableCell className="font-medium text-foreground">{r.pallet_name || "Order"}</TableCell>
                                  <TableCell className="text-muted-foreground">{bottles}</TableCell>
                                  <TableCell className="text-muted-foreground">{cap ? `${cap} platser` : "—"}</TableCell>
                                  <TableCell className="text-right">
                                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                                      {r.payment_status || r.status || "Pågående"}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </div>
              </section>
            </TabsContent>

            <TabsContent value="activity" className="mt-4 space-y-4 sm:mt-6 sm:space-y-6">
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Senaste aktivitet
                </h2>
                <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4 md:p-6">
                  {ipEvents.length === 0 ? (
                    <div className="py-5 text-center sm:py-6">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                        <Activity className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Ingen aktivitet ännu
                      </p>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        När du beställer eller fyller på pallar visas händelser här.
                      </p>
                    </div>
                  ) : (
                    <IPTimeline events={ipEvents} />
                  )}
                </div>
                {reservations.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-foreground sm:text-sm">
                      Reservationer
                    </h3>
                    <div className="space-y-2">
                      {reservations.slice(0, 5).map((r: any) => {
                        const totalBottles =
                          r.items?.reduce(
                            (s: number, it: any) => s + (it.quantity || 0),
                            0,
                          ) || 0;
                        return (
                          <div
                            key={r.id || r.order_id}
                            className="rounded-lg border border-border bg-card p-3"
                          >
                            <p className="text-sm font-medium text-foreground truncate">
                              {r.pallet_name || "Reservation"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {totalBottles} flaskor
                              {r.pallet_capacity
                                ? ` · ${r.pallet_capacity} kapacitet`
                                : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
