"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LevelBadge } from "@/components/membership/level-badge";

import {
  ArrowLeft,
  Calendar,
  Check,
  Lock,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

type Perk = {
  perk_type: string;
  perk_value: string;
  description: string;
};

type MembershipData = {
  membership: {
    level: string;
    impactPoints: number;
    levelAssignedAt: string;
  };
  levelInfo: {
    level: string;
    name: string;
    minPoints: number;
    maxPoints: number;
  };
  nextLevel:
    | {
        level: string;
        name: string;
        pointsNeeded: number;
        minPoints: number;
      }
    | null;
  perks: Perk[];
};

const perkIconByType: Record<string, any> = {
  invite_quota: Users,
  queue_priority: Zap,
  fee_reduction: Trophy,
  early_access: Calendar,
  exclusive_drops: Star,
  pallet_hosting: Shield,
  producer_contact: Shield,
};

function PerkRow({ perk, locked }: { perk: Perk; locked?: boolean }) {
  const Icon = perkIconByType[perk.perk_type] || Check;
  const showValue = perk.perk_value && perk.perk_value !== "true";

  return (
    <div
      className={
        "flex items-start justify-between gap-3 rounded-lg px-3 py-3 transition-colors " +
        (locked ? "opacity-60" : "hover:bg-muted/30")
      }
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={
            "flex h-9 w-9 items-center justify-center rounded-md border bg-white text-muted-foreground" +
            (locked ? "" : "")
          }
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {perk.description}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {perk.perk_type.replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {locked ? (
          <Badge variant="outline" className="text-[11px]">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        ) : null}
        {showValue ? (
          <Badge variant="secondary" className="text-[11px]">
            {perk.perk_value}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export default function ProfilePerksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [data, setData] = useState<MembershipData | null>(null);
  const [nextPerks, setNextPerks] = useState<Perk[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/user/membership");
        if (res.status === 401) {
          setUnauthorized(true);
          return;
        }
        if (!res.ok) {
          setData(null);
          return;
        }

        const json = (await res.json()) as MembershipData;
        setData(json);

        try {
          if (json?.nextLevel?.level) {
            const r2 = await fetch(
              `/api/user/membership/perks?level=${encodeURIComponent(
                json.nextLevel.level,
              )}`,
            );
            if (r2.ok) {
              const j2 = await r2.json();
              setNextPerks(Array.isArray(j2.perks) ? j2.perks : []);
            }
          }
        } catch {
          setNextPerks([]);
        }
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const progress = useMemo(() => {
    if (!data?.nextLevel) return null;
    const current = data.membership.impactPoints;
    const min = data.levelInfo.minPoints;
    const next = data.nextLevel.minPoints;
    const denom = Math.max(1, next - min);
    const pct = Math.max(0, Math.min(100, ((current - min) / denom) * 100));
    const remaining = Math.max(0, next - current);
    return { pct, remaining, next };
  }, [data]);

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-5xl mx-auto p-4 md:p-sides space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <Skeleton className="h-[140px] w-full rounded-xl" />
          <Skeleton className="h-[360px] w-full rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (unauthorized) {
    return (
      <PageLayout>
        <div className="pt-top-spacing px-4 sm:px-sides">
          <Card className="max-w-xl mx-auto border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Logga in för att se dina perks</CardTitle>
              <CardDescription>
                Du behöver vara inloggad för att visa denna sida.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="rounded-full bg-black text-white hover:bg-white hover:text-black hover:border-black"
                onClick={() => router.push("/log-in")}
              >
                Gå till inloggning
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (!data) {
    return (
      <PageLayout>
        <div className="pt-top-spacing px-4 sm:px-sides">
          <Card className="max-w-xl mx-auto border-border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Unable to load perks</CardTitle>
              <CardDescription>
                Something went wrong while loading membership data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="rounded-full" onClick={() => router.push("/profile")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-sides space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => router.push("/profile")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-foreground truncate">
                My Perks
              </h1>
              <p className="text-sm text-muted-foreground">
                Your membership benefits, in one place.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="hidden sm:inline-flex">
            <Sparkles className="h-3 w-3 mr-1" />
            {data.levelInfo.name}
          </Badge>
        </div>

        {/* Membership Card */}
        <Card className="border-border bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <LevelBadge
                  level={data.membership.level as any}
                  size="sm"
                  showLabel={false}
                  className="items-start"
                />
                <div>
                  <CardTitle className="text-base">{data.levelInfo.name}</CardTitle>
                  <CardDescription>Membership status</CardDescription>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground">Impact Points</p>
                <p className="text-base font-semibold text-foreground">
                  {data.membership.impactPoints} IP
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {progress ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {data.membership.impactPoints} / {progress.next} IP
                  </span>
                  <span>{progress.remaining} IP to go</span>
                </div>
                <Progress value={progress.pct} className="h-2" />
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[11px]">
                    Current
                  </Badge>
                  <Badge variant="outline" className="text-[11px]">
                    Next: {data.nextLevel?.name}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">You’re at the top level.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Perks */}
        <Tabs defaultValue="included" className="w-full">
          <TabsList className="w-full justify-start bg-white border border-border shadow-sm rounded-xl">
            <TabsTrigger value="included">Included</TabsTrigger>
            <TabsTrigger value="locked">Locked</TabsTrigger>
          </TabsList>

          <TabsContent value="included" className="mt-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Included perks</CardTitle>
                <CardDescription>
                  Benefits included with your current membership.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.perks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No perks found.</p>
                ) : (
                  <ScrollArea className="max-h-[420px]">
                    <div className="space-y-1">
                      {data.perks.map((perk, idx) => (
                        <PerkRow key={`${perk.perk_type}-${idx}`} perk={perk} />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locked" className="mt-4">
            <Card className="border-border bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Locked perks</CardTitle>
                <CardDescription>
                  Unlock these at your next level.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.nextLevel ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Next up: <span className="font-semibold text-foreground">{data.nextLevel.name}</span>
                        {" "}— {data.nextLevel.pointsNeeded} IP to unlock.
                      </p>
                    </div>

                    <Separator />

                    {nextPerks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No locked perks found.</p>
                    ) : (
                      <ScrollArea className="max-h-[420px]">
                        <div className="space-y-1">
                          {nextPerks.map((perk, idx) => (
                            <PerkRow key={`${perk.perk_type}-${idx}`} perk={perk} locked />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">You’re at the top level.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
