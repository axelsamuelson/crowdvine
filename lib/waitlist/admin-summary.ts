export type WaitlistSignupRow = {
  country_code: string;
  cart_snapshot: unknown;
  created_at?: string;
};

export type WaitlistCountrySummary = {
  countryCode: string;
  signups: number;
  bottles: number;
  topWines: Array<{ wineId: string; bottles: number }>;
};

function linesOf(snapshot: unknown): Array<{ wine_id: string; quantity: number }> {
  if (!Array.isArray(snapshot)) return [];
  return snapshot.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const wineId = String((row as { wine_id?: unknown }).wine_id ?? "");
    const quantity = Number((row as { quantity?: unknown }).quantity);
    if (!wineId || !Number.isFinite(quantity) || quantity <= 0) return [];
    return [{ wine_id: wineId, quantity }];
  });
}

export function summarizeWaitlist(
  rows: WaitlistSignupRow[],
): WaitlistCountrySummary[] {
  const byCountry = new Map<
    string,
    { signups: number; bottles: number; wines: Map<string, number> }
  >();
  for (const row of rows) {
    const code = String(row.country_code ?? "").toUpperCase();
    const bucket = byCountry.get(code) ?? {
      signups: 0,
      bottles: 0,
      wines: new Map<string, number>(),
    };
    bucket.signups += 1;
    for (const line of linesOf(row.cart_snapshot)) {
      bucket.bottles += line.quantity;
      bucket.wines.set(line.wine_id, (bucket.wines.get(line.wine_id) ?? 0) + line.quantity);
    }
    byCountry.set(code, bucket);
  }
  return [...byCountry.entries()]
    .map(([countryCode, bucket]) => ({
      countryCode,
      signups: bucket.signups,
      bottles: bucket.bottles,
      topWines: [...bucket.wines.entries()]
        .map(([wineId, bottles]) => ({ wineId, bottles }))
        .sort((a, b) => b.bottles - a.bottles)
        .slice(0, 10),
    }))
    .sort((a, b) => b.signups - a.signups);
}

export function waitlistCsv(rows: WaitlistSignupRow[]): string {
  const header = "country_code,created_at,wine_id,quantity";
  const body = rows.flatMap((row) => {
    const lines = linesOf(row.cart_snapshot);
    if (lines.length === 0) {
      return [`${row.country_code},${row.created_at ?? ""},,`];
    }
    return lines.map(
      (line) =>
        `${row.country_code},${row.created_at ?? ""},${line.wine_id},${line.quantity}`,
    );
  });
  return [header, ...body].join("\n");
}
