import { createHash } from "crypto";

/**
 * SHA-256 hex hash of buffer. Used for menu PDF idempotency (skip re-run if unchanged).
 */
export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
