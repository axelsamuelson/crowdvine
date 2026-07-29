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
        "grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-0",
        className,
      )}
    >
      {children}
    </div>
  );
};
