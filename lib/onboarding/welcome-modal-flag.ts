/**
 * Welcome modal mount gate. Default OFF — go-live is a separate date after 18/11.
 * Mirrors exit-discount: either server or NEXT_PUBLIC env must be explicitly true.
 */

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return fallback;
}

/** Feature must be explicitly enabled. Default OFF in all environments. */
export function isWelcomeModalEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    parseBool(env.WELCOME_MODAL_ENABLED, false) ||
    parseBool(env.NEXT_PUBLIC_WELCOME_MODAL_ENABLED, false)
  );
}
