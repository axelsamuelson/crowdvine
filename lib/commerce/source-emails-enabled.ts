/**
 * Master kill switch for automatic source (producer/wholesaler) emails.
 * Default OFF — nothing sends until SOURCE_EMAILS_ENABLED=true (Axel must
 * approve templates first). This PR only defines the gate; no senders call it yet.
 */

export function isSourceEmailsEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return (
    String(env.SOURCE_EMAILS_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}
