import {
  LABEL_COMPARISON_COLUMNS,
  LABEL_COMPARISON_ROWS,
  type LabelComparisonColumn,
  type LabelComparisonRowKey,
} from "@/lib/guides/articles/natural-vs-organic-vs-biodynamic-wine";

function cellValue(
  column: LabelComparisonColumn,
  key: LabelComparisonRowKey,
): string {
  return column[key];
}

/**
 * Label comparison: stacked cards below 640px, table from sm (640px) up.
 */
export function LabelComparisonTable() {
  return (
    <div>
      {/* Mobile: one card per label */}
      <div className="space-y-4 sm:hidden">
        {LABEL_COMPARISON_COLUMNS.map((column) => (
          <article
            key={column.id}
            className="border border-border bg-background p-4"
          >
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              {column.label}
            </h3>
            <dl className="mt-4 space-y-3 text-[15px] leading-relaxed text-foreground/80">
              {LABEL_COMPARISON_ROWS.map((row) => (
                <div key={row.key}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5">{cellValue(column, row.key)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="-mx-6 hidden overflow-x-auto px-6 sm:block">
        <table className="w-full min-w-[52rem] border-collapse text-left text-sm leading-snug text-foreground/80">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                className="sticky left-0 bg-background py-3 pr-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                <span className="sr-only">Attribute</span>
              </th>
              {LABEL_COMPARISON_COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="px-2 py-3 align-bottom text-sm font-semibold tracking-tight text-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LABEL_COMPARISON_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-border/70">
                <th
                  scope="row"
                  className="sticky left-0 bg-background py-3 pr-3 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {row.label}
                </th>
                {LABEL_COMPARISON_COLUMNS.map((column) => (
                  <td key={column.id} className="px-2 py-3 align-top">
                    {cellValue(column, row.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        (For wine, 1 mg/L ≈ 1 ppm.)
      </p>
    </div>
  );
}
