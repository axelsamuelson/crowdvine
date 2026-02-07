const B2B_BASE_URL = "https://dirtywine.se";
const B2C_BASE_URL = "https://pactwines.com";

/**
 * Base URL for invitation links. Business invites use dirtywine.se.
 * Client-safe: use NEXT_PUBLIC_B2B_APP_URL or fallback.
 */
export function getBaseUrlForInvite(allowedTypes: string[]): string {
  const hasBusiness = allowedTypes.includes("business");
  if (hasBusiness) {
    return (
      (typeof process !== "undefined" &&
        process.env?.NEXT_PUBLIC_B2B_APP_URL?.trim()) ||
      B2B_BASE_URL
    );
  }
  if (typeof window !== "undefined") return window.location.origin;
  return B2C_BASE_URL; // server fallback for user invites
}

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

/**
 * Build invite URL with correct base (business → dirtywine.se).
 * Use this when you have allowedTypes and want the full URL.
 */
export function buildInviteUrl(
  code: string,
  allowedTypes: string[],
): string {
  const baseUrl = getBaseUrlForInvite(allowedTypes);
  return getInviteUrl(baseUrl, code, allowedTypes);
}
