"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

export function InvitationLinkOpenedTracker({
  surface,
}: {
  surface: "i_consumer" | "ib_mixed" | "p_producer";
}) {
  const params = useParams();
  const code = params?.code as string | undefined;
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !code?.trim()) return;
    done.current = true;
    void AnalyticsTracker.trackEvent({
      eventType: "invitation_link_opened",
      eventCategory: "invitation",
      metadata: { surface, codeLength: code.trim().length },
    });
  }, [code, surface]);

  return null;
}
