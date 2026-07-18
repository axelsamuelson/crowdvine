"use client";

import { Badge } from "@/components/ui/badge";
import { getFunnelStepBadge } from "@/lib/analytics/funnel-step-badge";

export function FunnelStepBadgeEl({ step }: { step: string }) {
  const badge = getFunnelStepBadge(step);
  return <Badge className={badge.className}>{badge.label}</Badge>;
}
