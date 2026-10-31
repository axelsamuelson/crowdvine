import { cn } from "@/lib/utils";

export const ProductGrid = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      id="shop-product-grid"
      className={cn(
        // 12px mobile / 24px desktop, both axes
        "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
};
