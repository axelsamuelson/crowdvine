import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared PLP filter option row: same left edge; selected = #0A0A0A + check. */
export function shopFilterOptionClassName(
  isSelected: boolean,
  opts?: { density?: "default" | "sheet" },
) {
  const isSheet = opts?.density === "sheet";
  return cn(
    "flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm transition-colors",
    isSheet && "min-h-10",
    isSelected
      ? "font-medium text-[#0A0A0A]"
      : "text-neutral-500 md:hover:text-[#0A0A0A]",
  );
}

/**
 * Option list wrapper in the mobile filter sheet.
 * Scrolling is on CollapsibleContent (sheet density); keep mild bottom padding
 * so the last 40px row isn’t flush against the clip edge.
 */
export function shopFilterSheetListClassName() {
  return "pb-1";
}

export function ShopFilterOptionContent({
  selected,
  children,
}: {
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <span className="min-w-0 truncate">{children}</span>
      {selected ? (
        <Check aria-hidden className="size-[14px] shrink-0" strokeWidth={2} />
      ) : null}
    </>
  );
}
