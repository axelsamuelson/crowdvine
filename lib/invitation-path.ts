/**
 * Returns the invitation path prefix based on allowed types.
 * - business only → /b
 * - user only (consumer, producer) → /i
 * - both user and business → /ib
 */
export function getInvitePath(allowedTypes: string[]): string {
  const hasBusiness = allowedTypes.includes("business");
  const hasUser = allowedTypes.some((t) =>
    ["consumer", "producer"].includes(t),
  );

  if (hasBusiness && hasUser) return "/ib";
  if (hasBusiness) return "/b";
  return "/i";
}

export function getInviteUrl(
  baseUrl: string,
  code: string,
  allowedTypes: string[],
): string {
  const path = getInvitePath(allowedTypes);
  const cleanCode = code.trim().replace(/\s+/g, "");
  return `${baseUrl.replace(/\/$/, "")}${path}/${cleanCode}`;
}
