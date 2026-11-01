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

function RowLabel({ label }: { label: string }) {
  // Render SO₂ with a real HTML subscript when present.
  if (!label.includes("SO₂") && !label.includes("SO2")) {
    return <>{label}</>;
  }
  const parts = label.split(/SO₂|SO2/);
  return (
    <>
      {parts[0]}
      SO<sub>2</sub>
      {parts[1]}
    </>
  );
}

/**
 * Label comparison: stacked cards below 640px, table from sm (640px) up.
 * Heading and footnote stay in the article column; only the table breaks out.
 */
export function LabelComparisonTable() {
  return (
    <div data-label-comparison>
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
                    <RowLabel label={row.label} />
                  </dt>
                  <dd className="mt-0.5">{cellValue(column, row.key)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>

      {/* Desktop: table centred on the text column, may break out wider */}
      <div className="relative hidden sm:block">
        <div className="sm:-mx-6 md:-mx-12 lg:-mx-24">
          <div className="overflow-x-auto">
            <table className="mx-auto w-full max-w-[68ch] border-collapse text-left text-[13px] leading-snug text-foreground/80 sm:max-w-none lg:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="w-[7.5rem] py-3 pr-2 align-top text-xs font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    <span className="sr-only">Attribute</span>
                  </th>
                  {LABEL_COMPARISON_COLUMNS.map((column) => (
                    <th
                      key={column.id}
                      scope="col"
                      className="px-1.5 py-3 align-top font-semibold tracking-tight text-foreground"
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
                      className="py-3 pr-2 align-top text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      <RowLabel label={row.label} />
                    </th>
                    {LABEL_COMPARISON_COLUMNS.map((column) => (
                      <td key={column.id} className="px-1.5 py-3 align-top">
                        {cellValue(column, row.key)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        (For wine, 1 mg/L ≈ 1 ppm.)
      </p>
    </div>
  );
}
