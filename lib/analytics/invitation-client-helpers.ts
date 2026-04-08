import { AnalyticsTracker } from "@/lib/analytics/event-tracker";

/** Map validation error copy to analytics events (no raw codes). */
export function trackInvitationValidationClientFailure(errorText: string) {
  const lower = (errorText || "").toLowerCase();
  if (lower.includes("expired")) {
    void AnalyticsTracker.trackEvent({
      eventType: "invitation_code_expired",
      eventCategory: "invitation",
      metadata: { source: "client" },
    });
    return;
  }
  let reason: string = "validation_failed";
  if (lower.includes("already been used") || lower.includes("already used")) {
    reason = "already_used";
  } else if (
    lower.includes("deactivated") ||
    lower.includes("inactive") ||
    lower.includes("not active")
  ) {
    reason = "inactive";
  } else if (lower.includes("invalid") || lower.includes("not found")) {
    reason = "not_found";
  }
  void AnalyticsTracker.trackEvent({
    eventType: "invitation_code_invalid",
    eventCategory: "invitation",
    metadata: { source: "client", reason },
  });
}
