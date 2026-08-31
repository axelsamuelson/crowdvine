/**
 * OpEx normalization and break-even helpers (below GM3).
 */

export type OpexCadence = "monthly" | "annual" | "one_off";
export type OpexChannel = "pact" | "dirtywine" | "shared";

export type FinanceOpexEntry = {
  id: string;
  name: string;
  category: string;
  amountCents: number;
  currency: "SEK";
  cadence: OpexCadence;
  channel: OpexChannel;
  /** For shared: PACT allocation 0–100. Dirtywine = 100 − this when both configured. */
  sharedPactPercent: number | null;
  startsOn: string; // YYYY-MM-DD
  endsOn: string | null;
  active: boolean;
  notes: string | null;
};

export type PeriodRange = {
  start: Date;
  end: Date;
};

function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function daysInclusive(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000) + 1);
}

function overlaps(
  entryStart: string,
  entryEnd: string | null,
  period: PeriodRange,
): boolean {
  const es = parseDay(entryStart);
  const ee = entryEnd ? parseDay(entryEnd) : null;
  if (ee && ee < period.start) return false;
  if (es > period.end) return false;
  return true;
}

/**
 * Normalize an OpEx entry to SEK öre for the reporting period.
 * - monthly: amount × (period days / 30.4375) approximately via months overlap
 * - annual: amount × (period days / 365.25)
 * - one_off: full amount if start falls inside period (and active)
 */
export function normalizeOpexCentsForPeriod(
  entry: Pick<
    FinanceOpexEntry,
    | "amountCents"
    | "cadence"
    | "startsOn"
    | "endsOn"
    | "active"
  >,
  period: PeriodRange,
): number {
  if (!entry.active) return 0;
  if (!overlaps(entry.startsOn, entry.endsOn, period)) return 0;

  const amount = Math.max(0, Math.round(entry.amountCents));
  const periodDays = daysInclusive(period.start, period.end);
  if (periodDays <= 0) return 0;

  if (entry.cadence === "one_off") {
    const start = parseDay(entry.startsOn);
    return start >= period.start && start <= period.end ? amount : 0;
  }

  // Clip entry active window to period
  const es = parseDay(entry.startsOn);
  const ee = entry.endsOn ? parseDay(entry.endsOn) : period.end;
  const clipStart = es > period.start ? es : period.start;
  const clipEnd = ee < period.end ? ee : period.end;
  const activeDays = daysInclusive(clipStart, clipEnd);
  if (activeDays <= 0) return 0;

  if (entry.cadence === "monthly") {
    // amount is per calendar month ≈ 30.4375 days
    return Math.round(amount * (activeDays / 30.4375));
  }
  // annual
  return Math.round(amount * (activeDays / 365.25));
}

export function allocateOpexByChannel(
  entries: FinanceOpexEntry[],
  period: PeriodRange,
  channel: "pact" | "dirtywine" | "all",
): {
  allocatedCents: number;
  sharedUnallocatedCents: number;
  byCategory: Record<string, number>;
} {
  let allocated = 0;
  let sharedUnallocated = 0;
  const byCategory: Record<string, number> = {};

  for (const e of entries) {
    const normalized = normalizeOpexCentsForPeriod(e, period);
    if (normalized <= 0) continue;

    if (e.channel === "shared") {
      const pct = e.sharedPactPercent;
      if (pct == null || !Number.isFinite(pct) || pct < 0 || pct > 100) {
        if (channel === "all") {
          allocated += normalized;
          byCategory[e.category] = (byCategory[e.category] ?? 0) + normalized;
        } else {
          sharedUnallocated += normalized;
        }
        continue;
      }
      const pactShare = Math.round(normalized * (pct / 100));
      const dirtyShare = normalized - pactShare;
      if (channel === "all") {
        allocated += normalized;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + normalized;
      } else if (channel === "pact") {
        allocated += pactShare;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + pactShare;
      } else {
        allocated += dirtyShare;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + dirtyShare;
      }
      continue;
    }

    if (channel === "all" || e.channel === channel) {
      allocated += normalized;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + normalized;
    }
  }

  return {
    allocatedCents: allocated,
    sharedUnallocatedCents: sharedUnallocated,
    byCategory,
  };
}

export type BreakEvenResult =
  | {
      ok: true;
      bottlesRequired: number;
      netRevenueRequiredCents: number | null;
    }
  | { ok: false; reason: string };

/**
 * Break-even from GM3 contribution per bottle and period OpEx.
 */
export function calculateBreakEven(input: {
  opexCents: number;
  gm3CentsPerBottle: number;
  gm3PercentOfProductNet: number | null;
}): BreakEvenResult {
  const opex = Math.max(0, Math.round(input.opexCents));
  const perBottle = Math.round(input.gm3CentsPerBottle);
  if (perBottle <= 0) {
    return { ok: false, reason: "Ingen nollpunkt med nuvarande styckekonomi" };
  }
  const bottlesRequired = Math.ceil(opex / perBottle);
  let netRevenueRequiredCents: number | null = null;
  if (
    input.gm3PercentOfProductNet != null &&
    input.gm3PercentOfProductNet > 0
  ) {
    netRevenueRequiredCents = Math.ceil(
      opex / (input.gm3PercentOfProductNet / 100),
    );
  }
  return { ok: true, bottlesRequired, netRevenueRequiredCents };
}

/** Monthly run-rate from active entries (30.4375-day month). */
export function monthlyOpexRunRateCents(entries: FinanceOpexEntry[]): number {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  );
  return allocateOpexByChannel(entries, { start, end }, "all").allocatedCents;
}
