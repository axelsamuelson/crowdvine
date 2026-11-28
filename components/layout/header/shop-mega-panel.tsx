import Image from "next/image";

import type { MegaMenuColumn } from "@/lib/nav/shop-mega-menu";
import { cn } from "@/lib/utils";

const ROW =
  "flex min-h-12 min-w-0 items-center whitespace-normal border-b border-[rgba(10,10,10,0.10)] px-4 py-2 font-semibold text-sm uppercase leading-snug text-foreground no-underline";

function band(row: number): string {
  return row % 2 === 1 ? "bg-muted" : "bg-background";
}

export function ShopMegaColumns({
  columns,
  layout,
}: {
  columns: readonly MegaMenuColumn[];
  layout: "grid" | "stack";
}) {
  if (layout === "stack") {
    return (
      <div>
        {columns.map((column) => (
          <section key={column.id}>
            <h2 className="flex h-12 items-center border-b border-[#0A0A0A] bg-background px-4 font-semibold text-base uppercase text-foreground">
              {column.heading}
            </h2>
            <ul>
              {column.links.map((link, row) => (
                <li key={link.href}>
                  <a href={link.href} className={cn(ROW, band(row), "hover:bg-foreground hover:text-background")}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  }

  const rows = Math.max(0, ...columns.map((column) => column.links.length));
  return (
    <div
      className="grid bg-background"
      style={{
        gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
      }}
    >
      {columns.map((column, columnIndex) => (
        <h2
          key={column.id}
          className="flex h-12 items-center border-b border-[#0A0A0A] bg-background px-4 font-semibold text-base uppercase text-foreground"
          style={{ gridColumn: columnIndex + 1, gridRow: 1 }}
        >
          {column.heading}
        </h2>
      ))}
      {Array.from({ length: rows }, (_, row) =>
        columns.map((column, columnIndex) => {
          const link = column.links[row];
          const place = {
            gridColumn: columnIndex + 1,
            gridRow: row + 2,
          };
          if (!link) {
            return (
              <div
                key={`${column.id}-${row}`}
                className={cn(
                  "min-h-12 border-b border-[rgba(10,10,10,0.10)]",
                  band(row),
                )}
                style={place}
              />
            );
          }
          return (
            <a
              key={link.href}
              href={link.href}
              className={cn(ROW, band(row), "hover:bg-foreground hover:text-background")}
              style={place}
            >
              {link.label}
            </a>
          );
        }),
      )}
    </div>
  );
}

export function ShopMegaImageColumn({
  tiles,
  showImages,
}: {
  tiles: readonly { href: string; label: string; src: string }[];
  showImages: boolean;
}) {
  if (tiles.length === 0) return null;
  return (
    <div className="flex flex-col gap-4 border-l border-[#0A0A0A] bg-background p-4">
      {tiles.map((tile) => (
        <a key={tile.href} href={tile.href} className="block text-foreground no-underline">
          <span className="relative block aspect-square border border-[#0A0A0A]">
            {showImages ? (
              <Image
                src={tile.src}
                alt=""
                fill
                sizes="240px"
                className="object-cover"
              />
            ) : null}
          </span>
          <span className="mt-2 block font-semibold text-sm uppercase">
            {tile.label}
          </span>
        </a>
      ))}
    </div>
  );
}
