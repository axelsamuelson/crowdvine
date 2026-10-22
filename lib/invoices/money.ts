/** Öre helpers. Stored amounts are integers. SEK decimals are converted at the boundary. */

export function sekToOre(sek: number): number {
  if (!Number.isFinite(sek)) {
    throw new Error("Beloppet måste vara ett tal");
  }
  const sign = sek < 0 ? -1 : 1;
  const [whole, frac = "00"] = Math.abs(sek).toFixed(2).split(".");
  const ore = sign * (Number(whole) * 100 + Number(frac));
  if (!Number.isSafeInteger(ore)) {
    throw new Error("Beloppet är för stort");
  }
  return ore;
}

/** quantity may be fractional; the product is rounded to whole öre. */
export function lineTotalOre(quantity: number, unitPriceOre: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Antal måste vara större än 0");
  }
  if (!Number.isSafeInteger(unitPriceOre)) {
    throw new Error("À-pris måste vara hela öre");
  }
  const qtyScaled = Math.round(quantity * 10000);
  const product = qtyScaled * unitPriceOre;
  const total = Math.round(product / 10000);
  if (!Number.isSafeInteger(total)) {
    throw new Error("Radbeloppet är för stort");
  }
  return total;
}

/** VAT in öre. Matches Postgres ROUND(line_total_ore * vat_rate / 100). */
export function vatOre(lineTotal: number, vatRate: number): number {
  if (!Number.isFinite(vatRate) || vatRate < 0) {
    throw new Error("Momssats måste vara 0 eller högre");
  }
  const vat = Math.round((lineTotal * vatRate) / 100);
  if (!Number.isSafeInteger(vat)) {
    throw new Error("Momsbeloppet är för stort");
  }
  return vat;
}

export function sumOre(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}
