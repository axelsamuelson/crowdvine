export type CompletionMetric = "bottles" | "profit_sek";
export type CompletionComparator = ">=" | ">" | "<=" | "<";

export interface CompletionCondition {
  metric: CompletionMetric;
  op: CompletionComparator;
  value: number;
}

export interface CompletionGroup {
  operator: "AND" | "OR";
  conditions: CompletionCondition[];
}

export interface CompletionRules {
  /**
   * Rules evaluation mode:
   * - SEQUENTIAL: ordered IF / ELSE IF groups (first match wins)
   * - COMBINE: combine group results with operator (legacy)
   */
  mode?: "SEQUENTIAL" | "COMBINE";
  operator?: "AND" | "OR";
  groups: CompletionGroup[];
}

export interface CompletionMetrics {
  bottles: number;
  profit_sek: number;
}

function compare(left: number, op: CompletionComparator, right: number) {
  switch (op) {
    case ">=":
      return left >= right;
    case ">":
      return left > right;
    case "<=":
      return left <= right;
    case "<":
      return left < right;
    default:
      return false;
  }
}

export function evaluateCompletionRules(
  rules: CompletionRules | null | undefined,
  metrics: CompletionMetrics,
): boolean | null {
  if (!rules || !rules.groups || rules.groups.length === 0) return null;

  const groupResults = rules.groups.map((g) => {
    const condResults = (g.conditions || []).map((c) => {
      const left = metrics[c.metric];
      return compare(left, c.op, Number(c.value) || 0);
    });

    if (condResults.length === 0) return false;
    return g.operator === "AND"
      ? condResults.every(Boolean)
      : condResults.some(Boolean);
  });

  if (groupResults.length === 0) return null;

  // Default to sequential evaluation (IF / ELSE IF / ELSE) for clarity.
  const mode = rules.mode || "SEQUENTIAL";
  if (mode === "SEQUENTIAL") {
    return groupResults.some(Boolean);
  }

  const op = rules.operator || "OR";
  return op === "AND" ? groupResults.every(Boolean) : groupResults.some(Boolean);
}

export function formatCompletionRules(rules: CompletionRules | null | undefined) {
  if (!rules || !rules.groups || rules.groups.length === 0) return "IF — ELSE —";

  const fmtCond = (c: CompletionCondition) => {
    const left =
      c.metric === "bottles"
        ? "Bottles"
        : c.metric === "profit_sek"
          ? "Profit (SEK)"
          : c.metric;
    return `${left} ${c.op} ${Number(c.value)}`;
  };

  const fmtGroup = (g: CompletionGroup) => {
    const parts = (g.conditions || []).map(fmtCond);
    return parts.length ? `(${parts.join(` ${g.operator} `)})` : "(—)";
  };

  const mode = rules.mode || "SEQUENTIAL";

  if (mode === "SEQUENTIAL") {
    const steps = rules.groups.map(fmtGroup);
    const first = steps[0] || "(—)";
    const rest = steps.slice(1);
    const elseIf = rest.length ? ` ${rest.map((s) => `ELSE IF ${s} THEN Complete`).join(" ")}` : "";
    return `IF ${first} THEN Complete${elseIf} ELSE Incomplete`;
  }

  const op = rules.operator || "OR";
  const groups = rules.groups.map(fmtGroup);
  const ifClause = groups.join(` ${op} `);
  return `IF ${ifClause} THEN Complete ELSE Incomplete`;
}

