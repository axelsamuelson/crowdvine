import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shared PLP filter option row: same left edge; selected = #0A0A0A + check. */
export function shopFilterOptionClassName(isSelected: boolean) {
  return cn(
    "flex w-full cursor-pointer items-center justify-between gap-2 text-left text-sm transition-colors",
    isSelected
      ? "font-medium text-[#0A0A0A]"
      : "text-neutral-500 md:hover:text-[#0A0A0A]",
  );
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
