/**
 * Period helpers for Finance filters.
 */

export type FinancePeriodKey =
  | "this_month"
  | "last_month"
  | "last_30"
  | "quarter"
  | "ytd"
  | "custom";

export function resolveFinancePeriod(input: {
  key: FinancePeriodKey;
  customStart?: string | null;
  customEnd?: string | null;
  now?: Date;
}): { start: Date; end: Date; key: FinancePeriodKey } {
  const now = input.now ?? new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  const startOfDay = (dt: Date) =>
    new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
  const endOfDay = (dt: Date) =>
    new Date(
      Date.UTC(
        dt.getUTCFullYear(),
        dt.getUTCMonth(),
        dt.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

  switch (input.key) {
    case "this_month": {
      const start = new Date(Date.UTC(y, m, 1));
      const end = endOfDay(now);
      return { start, end, key: input.key };
    }
    case "last_month": {
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = endOfDay(new Date(Date.UTC(y, m, 0)));
      return { start, end, key: input.key };
    }
    case "last_30": {
      const end = endOfDay(now);
      const start = startOfDay(new Date(Date.UTC(y, m, d - 29)));
      return { start, end, key: input.key };
    }
    case "quarter": {
      const q = Math.floor(m / 3) * 3;
      const start = new Date(Date.UTC(y, q, 1));
      const end = endOfDay(now);
      return { start, end, key: input.key };
    }
    case "ytd": {
      const start = new Date(Date.UTC(y, 0, 1));
      const end = endOfDay(now);
      return { start, end, key: input.key };
    }
    case "custom": {
      const start = input.customStart
        ? startOfDay(new Date(input.customStart))
        : startOfDay(new Date(Date.UTC(y, m, 1)));
      const end = input.customEnd
        ? endOfDay(new Date(input.customEnd))
        : endOfDay(now);
      return { start, end, key: input.key };
    }
    default:
      return {
        start: new Date(Date.UTC(y, m, 1)),
        end: endOfDay(now),
        key: "this_month",
      };
  }
}

export function parsePeriodKey(raw: string | null | undefined): FinancePeriodKey {
  const v = String(raw || "this_month");
  if (
    v === "this_month" ||
    v === "last_month" ||
    v === "last_30" ||
    v === "quarter" ||
    v === "ytd" ||
    v === "custom"
  ) {
    return v;
  }
  return "this_month";
}
