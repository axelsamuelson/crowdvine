"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useWineZoneSwitcher,
  type EligibleGeoZoneRow,
} from "@/lib/hooks/use-wine-zone-switcher";
import type { UserZoneAddressTemplate } from "@/lib/checkout/user-zone-delivery-template";

function eligibilityStatusLabel(status: string): string {
  const s = status.trim().toLowerCase().replace(/-/g, "_");
  if (s === "normal_checkout") return "Normal checkout";
  if (s === "conditional_reservation") return "Conditional reservation";
  if (s === "interest_only") return "Interest only";
  return status.replace(/_/g, " ");
}

function regionHint(z: EligibleGeoZoneRow): string {
  const cc = (z.country_code ?? "").toUpperCase();
  const rc = z.region_code?.trim().toUpperCase() ?? "";
  if (rc) return `${cc} · ${rc}`;
  return cc || "";
}

function flagEmoji(countryCode: string): string {
  const m: Record<string, string> = {
    US: "🇺🇸",
    SE: "🇸🇪",
    GB: "🇬🇧",
    DK: "🇩🇰",
    FI: "🇫🇮",
    NO: "🇳🇴",
    DE: "🇩🇪",
    FR: "🇫🇷",
  };
  return m[countryCode.trim().toUpperCase()] ?? "🌐";
}

type DeliveryForm = {
  full_name: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
};

const emptyDelivery: DeliveryForm = {
  full_name: "",
  phone: "",
  email: "",
  address_line1: "",
  address_line2: "",
  city: "",
  postal_code: "",
};

function rowToForm(row: UserZoneAddressTemplate | null): DeliveryForm {
  if (!row) return { ...emptyDelivery };
  return {
    full_name: row.full_name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    address_line1: row.address_line1 ?? "",
    address_line2: row.address_line2 ?? "",
    city: row.city ?? "",
    postal_code: row.postal_code ?? "",
  };
}

export default function WineZoneSettingsPage() {
  const router = useRouter();
  const {
    signedIn,
    loading,
    activeZone,
    eligibleZones,
    patchingId,
    selectZone,
  } = useWineZoneSwitcher();

  const [addrLoading, setAddrLoading] = useState(false);
  const [addrSaving, setAddrSaving] = useState(false);
  const [zoneAddress, setZoneAddress] = useState<UserZoneAddressTemplate | null>(
    null,
  );
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>(emptyDelivery);

  useEffect(() => {
    if (signedIn === false) {
      router.replace("/log-in");
    }
  }, [signedIn, router]);

  const geoZoneId = activeZone?.geoZoneId?.trim() ?? "";

  const loadZoneAddress = useCallback(async () => {
    if (!geoZoneId) {
      setZoneAddress(null);
      setDeliveryForm(emptyDelivery);
      return;
    }
    setAddrLoading(true);
    try {
      const res = await fetch(
        `/api/user/zone-addresses?geoZoneId=${encodeURIComponent(geoZoneId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setZoneAddress(null);
        setDeliveryForm(emptyDelivery);
        return;
      }
      const j = (await res.json()) as {
        address?: UserZoneAddressTemplate | null;
      };
      const row =
        j.address && typeof j.address === "object" ? j.address : null;
      setZoneAddress(row);
      setDeliveryForm(rowToForm(row));
    } catch {
      setZoneAddress(null);
      setDeliveryForm(emptyDelivery);
    } finally {
      setAddrLoading(false);
    }
  }, [geoZoneId]);

  useEffect(() => {
    if (signedIn !== true) return;
    void loadZoneAddress();
  }, [signedIn, loadZoneAddress]);

  const onSelectZone = async (zoneId: string) => {
    await selectZone(zoneId, "Wine zone updated.");
  };

  const saveDelivery = async () => {
    if (!geoZoneId || !activeZone) return;
    const cc = activeZone.countryCode.trim().toUpperCase();
    if (cc.length !== 2) {
      toast.error("Wine zone country is invalid.");
      return;
    }
    const a1 = deliveryForm.address_line1.trim();
    const city = deliveryForm.city.trim();
    const postal = deliveryForm.postal_code.trim();
    if (!a1 || !city || !postal) {
      toast.error("Street, city, and postal code are required.");
      return;
    }

    const rc =
      activeZone.regionCode?.trim().toUpperCase().slice(0, 2) || null;

    setAddrSaving(true);
    try {
      const res = await fetch(
        `/api/user/zone-addresses/${encodeURIComponent(geoZoneId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: deliveryForm.full_name.trim() || undefined,
            phone: deliveryForm.phone.trim() || undefined,
            email: deliveryForm.email.trim() || undefined,
            address_line1: a1,
            address_line2: deliveryForm.address_line2.trim() || undefined,
            city,
            postal_code: postal,
            country_code: cc,
            region_code: rc,
          }),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        address?: UserZoneAddressTemplate;
      };
      if (!res.ok) {
        toast.error(body.error ?? "Could not save delivery details.");
        return;
      }
      if (body.address) {
        setZoneAddress(body.address);
        setDeliveryForm(rowToForm(body.address));
      }
      toast.success("Delivery details saved for this wine zone.");
      router.refresh();
    } catch {
      toast.error("Could not save delivery details.");
    } finally {
      setAddrSaving(false);
    }
  };

  if (signedIn === false) {
    return null;
  }

  const currency =
    activeZone?.currencyCode?.trim().toUpperCase() || "SEK";
  const displayName = activeZone?.displayName?.trim() || "";
  const activeId = activeZone?.geoZoneId ?? "";

  return (
    <PageLayout className="bg-muted px-sides pb-12">
      <div className="mx-auto w-full max-w-xl space-y-6 pt-top-spacing">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Wine zone</h1>
          <p className="text-sm text-muted-foreground">
            Shopping in and delivery templates are saved per wine zone. Your
            profile country, region, and city are not updated from this page.
          </p>
        </div>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Shopping in</CardTitle>
            <CardDescription>
              Current wine zone and how checkout runs for this region.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <p className="text-lg font-medium leading-snug">
                  {displayName || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {flagEmoji(activeZone?.countryCode ?? "")}{" "}
                  {(activeZone?.countryCode ?? "").toUpperCase() || "—"} ·{" "}
                  {currency}
                </p>
                {activeZone?.eligibilityStatus ? (
                  <p className="text-xs text-muted-foreground">
                    {eligibilityStatusLabel(activeZone.eligibilityStatus)}
                  </p>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">Change wine zone</CardTitle>
            <CardDescription>
              Choose where you shop; pallet availability follows this zone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : eligibleZones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wine zones are available right now.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {eligibleZones.map((z) => {
                  const isCurrent = Boolean(activeId && z.id === activeId);
                  const busy = patchingId === z.id;
                  return (
                    <li key={z.id}>
                      <button
                        type="button"
                        disabled={busy || isCurrent}
                        onClick={() => void onSelectZone(z.id)}
                        className={cn(
                          "flex w-full flex-col items-start gap-0.5 rounded-md border border-transparent px-3 py-2.5 text-left text-sm transition-colors",
                          isCurrent
                            ? "border-border bg-accent/50"
                            : "hover:bg-muted/80",
                          busy && "opacity-70",
                        )}
                      >
                        <span className="font-medium">
                          {flagEmoji(z.country_code)}{" "}
                          {z.display_name?.trim() || z.id}
                          {isCurrent ? (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              Current
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {regionHint(z)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {eligibilityStatusLabel(z.eligibility_status)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-base">
              {displayName
                ? `Delivery details for ${displayName}`
                : "Delivery details for this zone"}
            </CardTitle>
            <CardDescription>
              Used at checkout for this wine zone only. Not the same as your
              profile contact fields.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!geoZoneId ? (
              <p className="text-sm text-muted-foreground">
                Choose a wine zone to manage delivery details for this zone.
              </p>
            ) : addrLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="z-cc">Country (wine zone)</Label>
                    <Input
                      id="z-cc"
                      readOnly
                      value={(activeZone?.countryCode ?? "").toUpperCase()}
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="z-rc">Region / state (wine zone)</Label>
                    <Input
                      id="z-rc"
                      readOnly
                      value={
                        activeZone?.regionCode?.toUpperCase() || "—"
                      }
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="z-name">Full name</Label>
                    <Input
                      id="z-name"
                      value={deliveryForm.full_name}
                      onChange={(e) =>
                        setDeliveryForm((f) => ({
                          ...f,
                          full_name: e.target.value,
                        }))
                      }
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="z-phone">Phone</Label>
                      <Input
                        id="z-phone"
                        value={deliveryForm.phone}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            phone: e.target.value,
                          }))
                        }
                        autoComplete="tel"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="z-email">Email</Label>
                      <Input
                        id="z-email"
                        type="email"
                        value={deliveryForm.email}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            email: e.target.value,
                          }))
                        }
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="z-a1">Street address</Label>
                    <Input
                      id="z-a1"
                      value={deliveryForm.address_line1}
                      onChange={(e) =>
                        setDeliveryForm((f) => ({
                          ...f,
                          address_line1: e.target.value,
                        }))
                      }
                      autoComplete="address-line1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="z-a2">Apartment, suite, etc. (optional)</Label>
                    <Input
                      id="z-a2"
                      value={deliveryForm.address_line2}
                      onChange={(e) =>
                        setDeliveryForm((f) => ({
                          ...f,
                          address_line2: e.target.value,
                        }))
                      }
                      autoComplete="address-line2"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="z-city">City</Label>
                      <Input
                        id="z-city"
                        value={deliveryForm.city}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            city: e.target.value,
                          }))
                        }
                        autoComplete="address-level2"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="z-postal">Postal code</Label>
                      <Input
                        id="z-postal"
                        value={deliveryForm.postal_code}
                        onChange={(e) =>
                          setDeliveryForm((f) => ({
                            ...f,
                            postal_code: e.target.value,
                          }))
                        }
                        autoComplete="postal-code"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => void saveDelivery()}
                    disabled={addrSaving}
                  >
                    {addrSaving ? "Saving…" : "Save delivery details"}
                  </Button>
                  {zoneAddress ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeliveryForm(rowToForm(zoneAddress))}
                      disabled={addrSaving}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          <Button variant="link" className="h-auto p-0" asChild>
            <Link href="/profile">Back to profile</Link>
          </Button>
        </p>
      </div>
    </PageLayout>
  );
}
