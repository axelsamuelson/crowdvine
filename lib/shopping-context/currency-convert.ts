/** Pure currency math — safe for client and server (no next/headers). */

export function convertSekForDisplay(
  amountSek: number,
  currencyCode: string,
  sekToDisplayRate: number,
): number {
  const code = currencyCode.trim().toUpperCase();
  if (code === "SEK" || sekToDisplayRate === 1) return amountSek;
  return amountSek * sekToDisplayRate;
}
