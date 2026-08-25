/**
 * Bump the version string manually whenever the corresponding legal
 * document content changes. The terms version is logged against the order
 * when the customer accepts the purchase terms at checkout.
 */
export const LEGAL_VERSIONS = {
  terms: "2026-08-25",
  privacy: "2026-08-25",
  cookies: "2026-09-01",
} as const;

export type LegalDocument = keyof typeof LEGAL_VERSIONS;
