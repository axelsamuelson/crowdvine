import { Fragment, type ReactNode } from "react";

type GuideTableColumn = {
  key: string;
  label: string;
  className?: string;
  /** Header is available to assistive tech and hidden visually. */
  srOnlyLabel?: boolean;
};

type GuideRankTableProps = {
  columns: GuideTableColumn[];
  rows: Array<Record<string, ReactNode> & { rank: number }>;
  /** Full-width subheading rendered immediately before this rank. */
  dividerBeforeRank?: number;
  dividerLabel?: string;
};

export function GuideRankTable({
  columns,
  rows,
  dividerBeforeRank,
  dividerLabel,
}: GuideRankTableProps) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={`whitespace-nowrap py-3 pr-4 text-xs font-medium uppercase tracking-wide text-muted-foreground ${column.className ?? ""}`}
              >
                {column.srOnlyLabel ? (
                  <span className="sr-only">{column.label}</span>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Fragment key={row.rank}>
              {dividerBeforeRank === row.rank && dividerLabel ? (
                <tr>
                  <th
                    colSpan={columns.length}
                    scope="colgroup"
                    className="border-t-2 border-border px-0 pb-3 pt-8 text-left text-base font-semibold normal-case tracking-normal text-foreground"
                  >
                    {dividerLabel}
                  </th>
                </tr>
              ) : null}
              <tr className="border-b border-border/70 last:border-b-0">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`py-2.5 pr-4 align-top text-foreground ${column.className ?? ""}`}
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
