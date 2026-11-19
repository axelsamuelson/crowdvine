/**
 * Wilson score interval + low-n display rules (spec §6.6).
 */

export type WilsonInterval = { low: number; high: number };

export type LowNLevel = "hide" | "caution" | "ok";

/**
 * Wilson score interval for a binomial proportion (successes / total).
 * Default z = 1.96 ≈ 95 % confidence.
 * Returns proportions in [0, 1]. Degenerate totals yield {0,0}.
 */
export function wilsonInterval(
  successes: number,
  total: number,
  z = 1.96,
): WilsonInterval {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) {
    return { low: 0, high: 0 };
  }
  const n = total;
  const phat = Math.min(Math.max(successes, 0), n) / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = phat + z2 / (2 * n);
  const margin =
    z * Math.sqrt((phat * (1 - phat) + z2 / (4 * n)) / n);
  const low = Math.max(0, (centre - margin) / denom);
  const high = Math.min(1, (centre + margin) / denom);
  return { low, high };
}

/**
 * Spec 6.6:
 * - n < 10 → hide percent ("3 av 7")
 * - 10 ≤ n < 30 → caution (grey + amber warning)
 * - n ≥ 30 → ok
 */
export function lowNLevel(n: number): LowNLevel {
  if (!Number.isFinite(n) || n < 10) return "hide";
  if (n < 30) return "caution";
  return "ok";
}
