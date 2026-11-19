/**
 * H9 / M5: invited-friend profile union for the three canonical PACT inviters.
 * Mirrors analytics_invited_friend_profiles (migrations/299).
 * No emails in this module.
 */

/** Henrik Frienholt, ave.samuelson, admin@pactwines.com — UUIDs only. */
export const CANONICAL_INVITER_IDS = [
  "8aeec114-78a8-47b5-b535-12b355964933", // Henrik Frienholt
  "cdc144b5-a8d5-48a3-a28a-03d76cfef4f9", // ave.samuelson
  "a957a784-6112-4ec9-b474-f2b025fc4fad", // admin@pactwines.com
] as const;

export type InvitedFriendSources = {
  /** invitation_codes.used_by where created_by ∈ canonical */
  usedBy: Iterable<string | null | undefined>;
  /** referral_signups.invitee_id where inviter_id ∈ canonical */
  inviteeIds: Iterable<string | null | undefined>;
};

/**
 * Union of used_by + invitee_id sets (distinct, non-null UUIDs).
 * This is the TS mirror of the SQL view rule — not a live DB query.
 */
export function mergeInvitedFriendProfileIds(
  sources: InvitedFriendSources,
): string[] {
  const out = new Set<string>();
  for (const id of sources.usedBy) {
    if (typeof id === "string" && id.trim()) out.add(id.trim());
  }
  for (const id of sources.inviteeIds) {
    if (typeof id === "string" && id.trim()) out.add(id.trim());
  }
  return [...out].sort();
}

export function isCanonicalInviter(profileId: string | null | undefined): boolean {
  if (!profileId) return false;
  return (CANONICAL_INVITER_IDS as readonly string[]).includes(profileId);
}
