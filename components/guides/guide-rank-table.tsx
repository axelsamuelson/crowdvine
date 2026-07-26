type GuideTableColumn = {
  key: string;
  label: string;
  className?: string;
};

type GuideRankTableProps = {
  columns: GuideTableColumn[];
  rows: Array<Record<string, string | number>>;
};

export function GuideRankTable({ columns, rows }: GuideRankTableProps) {
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
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={String(row.rank)}
              className="border-b border-border/70 last:border-b-0"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-2.5 pr-4 align-top text-foreground ${column.className ?? ""}`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
